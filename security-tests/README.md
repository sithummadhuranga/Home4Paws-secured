# Home4Paws – Authorization Test Suite (Member 2)

Postman collection that checks access control on every endpoint covered by
V02, V03, V04, V05 and V14, as **anonymous**, **normal user (userA / userB)** and **admin**.

- `SECURE:` tests assert the secure behaviour (401 / 403 / 404). On the original
  code they **fail**, which proves the vulnerability. After the fixes they must **pass**.
- `FUNCTIONAL:` tests check that legitimate access still works (e.g. admin can
  create products, owner can edit their own pet report).

## Run it

1. Start the API locally (http://localhost:5185) against a **local** database.
2. Postman → Import → `Home4Paws-M2-authz.postman_collection.json`.
3. Postman → Settings → General → **Working directory** = this `security-tests` folder,
   so the file upload `test-pet.png` is found.
4. Collection → Variables: set the **current value** of `adminEmail` / `adminPassword`
   to a local admin account. Do not save real passwords into the collection file.
5. Run the whole collection in order with the Collection Runner. `00 Setup` creates
   userA, userB, a fresh userC, a category and three pet reports owned by userA.

Command line (newman):

```bash
npx newman run Home4Paws-M2-authz.postman_collection.json \
  --working-dir . --env-var adminPassword=<local admin password>
```
