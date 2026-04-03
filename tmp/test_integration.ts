
(async () => {
  const resp = await fetch('http://localhost:4000/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      name: "TEST_SYNC_PLX", 
      email: "test_sync@gmail.com", 
      document: "000.000.000-00", 
      amount: "49,90" 
    })
  });
  console.log("Status:", resp.status);
  console.log("Body:", await resp.json());
})();
