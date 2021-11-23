
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // First, validate the message's structure.
  if (request.action === 'addDataToSheet' && request.spreadsheetId && request.data.length) {
    // Enable the page-action for the requesting tab.
    new Promise((resolve) => {
      chrome.identity.getAuthToken({ 'interactive': true }, async (token) => {
        try{
          let init = {
            method: 'POST',
            async: true,
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            'contentType': 'json',
            body: JSON.stringify({
              "requests": [{
                "addSheet": {
                  "properties": {"title": "ha_export_new"},
                }
              }]
            }),
            "valueInputOption": "USER_ENTERED",
          };
          await fetch(
            'https://sheets.googleapis.com/v4/spreadsheets/'+ request.spreadsheetId +':batchUpdate', init)
            .then((response) => response.json());

          init.body = JSON.stringify({
            "range": "ha_export_new!A1",
            "majorDimension": "ROWS",
            "values": request.data,
          })
          console.log(init);
          await fetch(
            'https://sheets.googleapis.com/v4/spreadsheets/'+ request.spreadsheetId +'/values/ha_export_new!A1:append?valueInputOption=USER_ENTERED', init)
            .then((response) => response.json())
            .then( data => console.log(data))
          resolve({status: "done"});
        }
        catch (e) {
          resolve({
            status: 'failed',
            message: e.message
          });
        }
      });
    }).then(result => sendResponse(result));

    return true;
  }
  else{
    sendResponse({
      status : 'failed',
      message: 'Missing Parameter!'
    });
  }
});
