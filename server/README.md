# XSN Block Explorer - Server

## Run
1. We need the xsn rpc server running, download the latest one from [xsn releases](https://github.com/X9Developers/XSN/releases), then, start the rpc server with: `bin/xsnd -txindex -rpcport=51473 -rpcuser=dummy -rpcpassword=replaceme`

2. Edit the [application.conf](server/conf/application.conf).

* In case you modified the parameters to start the xsn rpc server, update the credentials.

* Set the credentials to access a postgres database.

3. Run the application with: `sbt run`

## Bitcoin
If you want to run the explorer for Bitcoin, checkout the `bitcoin` branch and then, apply manually the following SQL commands:
```sql
ALTER TABLE transaction_inputs DROP CONSTRAINT transaction_inputs_txid_fk;
ALTER TABLE transaction_inputs DROP CONSTRAINT transaction_inputs_from_fk;

ALTER TABLE transaction_outputs DROP CONSTRAINT transaction_outputs_txid_fk;
ALTER TABLE transaction_outputs DROP CONSTRAINT transaction_outputs_spent_on_fk;

ALTER TABLE address_transaction_details DROP CONSTRAINT address_transaction_details_txid_fk;
```

## Test
Run the `sbt test` command to execute the tests.

In case of failed tests, verify that:
- The docker remote API is enabled (this command must succeed `curl localhost:4243/containers/json` on linux).
- Try running `DOCKER_HOST=localhost:4243 sbt test` instead.
