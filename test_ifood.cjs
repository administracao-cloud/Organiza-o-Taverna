const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
async function run() {
  const res = await fetch('http://localhost:3000/api/ifood/polling?clientId=sandbox-test&clientSecret=secret');
  console.log(await res.json());
}
run();
