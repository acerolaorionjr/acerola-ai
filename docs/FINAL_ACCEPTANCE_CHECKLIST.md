# Acerola AI — Final Manual Acceptance Checklist

Use a separate test account and harmless test content. Do not send passwords, access tokens, API keys, service-role keys, private conversations or customer records to anyone.

## 1. Public pages

- [ ] Open the home page on Android and confirm the Acerola interface loads.
- [ ] Open the sponsorship page and confirm the hero, product sections and evidence links load.
- [ ] Repeat on a desktop browser if available.
- [ ] Record the page URL and date. A screenshot should not show account details.

## 2. Authenticated chat

- [ ] Sign in with a designated test account.
- [ ] Send one harmless prompt, such as: "Explain what a database is in three sentences."
- [ ] Confirm that a response appears and the interface does not remain stuck in a loading state.
- [ ] Note any displayed provider/model details and the exact error text if it fails.
- [ ] Sign out and confirm the account session ends.

## 3. Memory and account isolation

- [ ] Use test account A to save a non-sensitive test phrase, for example: "Project marker: ORANGE-TEST-42."
- [ ] Confirm account A can retrieve its own marker.
- [ ] Sign out and sign in with test account B.
- [ ] Ask for account A's marker. Account B must not receive it.
- [ ] Remove the test marker from account A when finished.

## 4. Attachments and media

- [ ] Upload one harmless file smaller than 8 MB.
- [ ] Confirm the attachment preview appears and the request completes.
- [ ] If the feature is available and the API budget permits, run one image-generation test.
- [ ] If spoken-audio generation is available and budget permits, run one audio test.
- [ ] Do not repeat generation requests to stress-test a live paid API.

## 5. Monthly usage limits

- [ ] Confirm the gateway returns usage metadata on a successful request.
- [ ] Confirm the application displays a clear limit message if a test account is already at its configured limit.
- [ ] Do not deliberately exhaust a real account's monthly allowance. Use a dedicated staging/test setup for limit-boundary testing.

## 6. Background jobs

- [ ] Submit one normal chat request through the UI.
- [ ] Confirm the reply arrives and the job does not remain pending.
- [ ] If a request fails with a permanent client error, confirm it is not repeatedly retried.
- [ ] Keep a dated result. Do not expose the encrypted job token or worker secret.

## 7. Payments — test mode only

- [ ] Have a parent/guardian or responsible adult review the payment setup.
- [ ] Use Paystack test mode only for checkout, webhook, renewal and cancellation acceptance.
- [ ] Confirm test transactions are not presented as real revenue.
- [ ] Do not use real payment details or make a real payment as part of this checklist.

## 8. Report a failure safely

Record only:
- Date and approximate time.
- Feature being tested.
- Device/browser.
- What you expected.
- What happened.
- Exact user-visible error message.

Remove email addresses, account IDs, phone numbers, transaction references, tokens and private content before sharing screenshots or logs.
