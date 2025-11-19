fetch(" https://21bcfa88bd12.ngrok-free.app/denial")
  .then(response => {
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    return response.json();
  })
  .then(data => {
    console.log("Claim Data:", data);
  })
  .catch(error => {
    console.error("Fetch error:", error);
  });
 