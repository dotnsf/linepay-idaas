# LINE Pay with IDaaS

## Setups

- Sign in to `Auth0`, create (web) application, and get/set credential informations below:

  - Client ID
  - Client Secret
  - Callback URL for your application
  - Domain("xxxxxxxx.xx.auth0.com")

- In Auth0 application dashboard, set **Callback URL** and **allowed logout URL** for your application.

- Sign in to `LINE Pay`, enabled Sandbox, and get/set credential informations below:

  - Channel ID
  - Channel Secret
  - Confirm URL for your application

- Prepare `PostgreSQL` database, and get `DATABASE_URL` for that.

  - `psql` into your database, and execute `\i linepay-idaas.ddl`.

- Edit `item.json`, if you want. You can specify your purchace item attributes with price there, which you would pay in this application.


## Environment values

- `LINE_PAY_CHANNEL_ID` : Channel ID for LINE Pay

- `LINE_PAY_CHANNEL_SECRET` : Channel Secret for LINE Pay

- `LINE_PAY_CONFIRM_URL` : Confirmation URL for LINE Pay

- `DATABASE_URL` : URL connection string for PostgreSQL

- `PGSSLMODE` : SSL Mode for PostgreSQL connection(default: "no-verify")

- `AUTH0_CLIENT_ID` : Client ID for Auth0

- `AUTH0_CLIENT_Secret` : Client Secret for Auth0

- `AUTH0_CALLBACK_URL` : Callback URL for Auth0

- `AUTH0_DOMAIN` : Domain for your Auth0


## How to run

- Get source:

  - `$ git clone https://github.com/dotnsf/linepay-idaas`
  - `$ cd linepay-idaas`

- Create `.env` file, and populate environmant values for your environment:

  - `$ touch .env`

```
LINE_PAY_CHANNEL_ID=xxxxxxx
LINE_PAY_CHANNEL_SECRET=xxxxxxxxxx
LINE_PAY_CONFIRM_URL=http://localhost:8080/pay/confirm
DATABASE_URL=postgres://user:pass@postgres-server:5432/db
PGSSLMODE=no-verify
AUTH0_CALLBACK_URL=http://localhost:8080/auth0/callback
AUTH0_CLIENT_ID=xxxxxxxxxxx
AUTH0_CLIENT_SECRET=xxx-xxxx-xxxxx
AUTH0_DOMAIN=xxxxxxx.us.auth0.com
```

- Install dependencies:

  - `$ npm install`

- Run

  - `$ npm start`

- Access to your application

  - `http://localhost:8080`

- If you need to create user, sign-up with it at this moment.

- Login to your application.




## Licensing

This code is licensed under MIT.


## Copyright

2022 K.Kimura @ Juge.Me all rights reserved.

