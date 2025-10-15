const fetch = require('node-fetch');

async function testPlansAPI() {
  try {
    console.log("Testing backend API: http://localhost:5001/api/admin/plans\n");
    
    // You'll need to replace this with a valid admin token
    const token = "YOUR_ADMIN_TOKEN_HERE";
    
    const response = await fetch('http://localhost:5001/api/admin/plans', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log("Response status:", response.status);
    const data = await response.json();
    
    console.log("\nResponse data:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log("\n=== Plans with apple_product_id ===");
      data.data.forEach(plan => {
        console.log(`${plan.name}: apple_product_id = ${plan.apple_product_id || '(null)'}`);
      });
    }
    
  } catch (e) {
    console.error("Error:", e.message);
    console.log("\nMake sure your backend server is running on http://localhost:5001");
  }
}

testPlansAPI();
