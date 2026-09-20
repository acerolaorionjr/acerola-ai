import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://acerolaorionjr.github.io",
  "http://localhost:3000",
  "http://localhost:5173"
]);
const MAX_PROMPT = 5000;

function headers(origin: string | null) {
  const h: Record<string,string> = {
    "Content-Type":"application/json; charset=utf-8",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Max-Age":"86400",
    "Cache-Control":"no-store",
    "Vary":"Origin",
    "X-Content-Type-Options":"nosniff"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"]=origin;
  return h;
}
function json(data: unknown,status=200,origin:string|null=null){
  return new Response(JSON.stringify(data),{status,headers:headers(origin)});
}
async function authorized(req:Request){
  const auth=req.headers.get("Authorization");
  const key=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY")||"";
  const url=Deno.env.get("SUPABASE_URL")||"";
  if(!auth?.startsWith("Bearer ")||!key||!url)return false;
  try{
    return (await fetch(url+"/auth/v1/user",{headers:{Authorization:auth,apikey:key}})).ok;
  }catch{return false;}
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("Origin");
  if(origin&&!ALLOWED_ORIGINS.has(origin))return json({error:"Origin not allowed",code:"ORIGIN_NOT_ALLOWED"},403,origin);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=="POST")return json({error:"POST only"},405,origin);
  if(!(await authorized(req)))return json({error:"Authentication required",code:"AUTH_REQUIRED"},401,origin);
  const key=Deno.env.get("OPENAI_API_KEY")||"";
  if(!key)return json({error:"OpenAI API key is not configured",code:"OPENAI_NOT_CONFIGURED"},503,origin);
  let body:any;
  try{body=await req.json();}catch{return json({error:"Invalid JSON",code:"INVALID_JSON"},400,origin);}
  const prompt=String(body?.prompt||"").trim();
  if(!prompt)return json({error:"prompt is required",code:"PROMPT_REQUIRED"},400,origin);
  if(prompt.length>MAX_PROMPT)return json({error:"prompt is too long",code:"PROMPT_TOO_LONG"},413,origin);

  const size=["1024x1024","1024x1536","1536x1024"].includes(body?.size)?body.size:"1024x1024";
  const quality=["low","medium","high","auto"].includes(body?.quality)?body.quality:"auto";
  const format=["png","webp","jpeg"].includes(body?.output_format)?body.output_format:"png";

  try{
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"gpt-image-2",
        input:prompt,
        tools:[{
          type:"image_generation",
          action:"generate",
          size,
          quality,
          output_format:format
        }]
      })
    });
    const raw=await r.text();
    let data:any={};try{data=JSON.parse(raw);}catch{}
    if(!r.ok){
      const message=String(data?.error?.message||"Image generation failed").slice(0,500);
      return json({error:message,code:r.status===429?"IMAGE_QUOTA_OR_RATE_LIMIT":"IMAGE_GENERATION_FAILED"},r.status===429?429:502,origin);
    }
    const call=(data?.output||[]).find((x:any)=>x?.type==="image_generation_call");
    const b64=call?.result||"";
    if(!b64)return json({error:"The image model returned no image.",code:"IMAGE_EMPTY"},502,origin);
    return json({
      ok:true,
      image:"data:image/"+format+";base64,"+b64,
      format,
      size,
      quality,
      model:data?.model||"gpt-image-2"
    },200,origin);
  }catch(error){
    return json({error:error instanceof Error?error.message:"Image service unavailable",code:"IMAGE_NETWORK_FAILED"},502,origin);
  }
});
