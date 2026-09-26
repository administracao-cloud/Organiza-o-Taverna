const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
async function run() {
  const newOrder = {
    id: "ifd-test1234",
    code: "#IFD-1234",
    customerName: "Test User",
    status: "pendente",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const res = await fetch('http://localhost:3000/api/orders/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders: [newOrder] })
  });
  console.log(await res.json());
}
run();
