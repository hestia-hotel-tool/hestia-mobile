# Email (guest reclamation)

Lost & Found → Register → step 3 → **Send Email to Guest for reclamation?** emails the guest about the item.

```
app ──lf_email_guest(item, address)──▶ email_outbox (queued)
     trigger (pg_net) ──▶ Edge Function send-email ──▶ your provider
```

- The message is written by the database from the stored item (`lf_email_guest`, migration `20261023120000`), not by the app. It includes the guest's name, the hotel, where and when the item was found, the item and its tracking number.
- Replies go to the hotel's `contact_email` (column on `hotels`), else `EMAIL_REPLY_TO`.
- Every email is a row in `email_outbox` with `status` (`queued` / `sending` / `sent` / `failed`), `attempts`, `last_error` and the provider's message id.
- Until a provider is configured, emails wait in the outbox (`last_error` says why) and are sent once you turn it on.

## Turn it on

1. Create an account with one provider and verify your sending domain (SPF/DKIM). The provider's dashboard walks you through the DNS records.
2. Set the secrets on the Supabase project. The easiest way is to fill in `supabase/functions/.env.development` / `.env.production` (gitignored, email keys only), then:
   ```sh
   supabase secrets set --env-file supabase/functions/.env.development --project-ref <dev ref>
   ```
   Or set them one by one, for example:

   **Resend** (simplest):
   ```sh
   supabase secrets set EMAIL_PROVIDER=resend \
     EMAIL_API_KEY=re_xxx \
     EMAIL_FROM="Hestia Lost & Found <lostandfound@yourhotel.com>" \
     --project-ref <ref>
   ```

   | Provider | Secrets |
   |---|---|
   | Resend | `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY` |
   | SendGrid | `EMAIL_PROVIDER=sendgrid`, `EMAIL_API_KEY` |
   | Postmark | `EMAIL_PROVIDER=postmark`, `EMAIL_API_KEY` (server token) |
   | Mailgun | `EMAIL_PROVIDER=mailgun`, `EMAIL_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION=eu` (EU accounts only) |
   | SMTP | `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` |

   All of them also need `EMAIL_FROM`. `EMAIL_REPLY_TO` is optional.
   SMTP must use port **465**: Supabase blocks outbound 25 and 587.

3. Optional: set the hotel's reply address and phone (shown in the email):
   ```sql
   update hotels set contact_email = 'concierge@yourhotel.com', contact_phone = '+41 …' where id = '…';
   ```

4. Send anything that queued before you configured it. This is the same call the trigger makes; the secret is `PUSH_WEBHOOK_SECRET`:
   ```sh
   curl -X POST "https://<ref>.supabase.co/functions/v1/send-email" \
     -H "content-type: application/json" -H "x-push-secret: $PUSH_WEBHOOK_SECRET" \
     -d '{"pending": true}'
   ```

No app release and no redeploy is needed: the function reads the secrets on each call.

## Check it

```sql
select created_at, to_email, status, attempts, last_error, provider, provider_message_id
from email_outbox order by created_at desc limit 20;
```

## Deploying to a new project

- Apply the migration.
- Deploy the function: `supabase functions deploy send-email --project-ref <ref>`.
- The trigger finds the function from the push setup: the vault secret `push_dispatch_url` with `/notify` swapped for `/send-email`, signed with `push_dispatch_secret`. If push is set up, email is too. To point it elsewhere, add a vault secret `email_dispatch_url`.
