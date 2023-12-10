// Function to retrieve the state register from Notion
function getStateRegister() {
  // Define payload for Notion API query to filter based on a specific description
  let payload = {
    "filter": {
      "property": "Description",
      "rich_text": {
        "equals": "Setup - Do Not Delete This Entry"
      }
    }
  }

  // Set up options for the HTTP request to Notion API
  let options = {
    "method": 'post',
    headers: {
      "Content-Type": "application/json",
      "Notion-Version": "2022-02-22",
      "Authorization": "Bearer " + notionToken
    },
    "payload": JSON.stringify(payload)
  }

  // Set up options for the HTTP request to fetch child blocks
  let blockOptions = {
    "method": 'get',
    headers: {
      "Content-Type": "application/json",
      "Notion-Version": "2022-02-22",
      "Authorization": "Bearer " + notionToken
    }
  }

  // Fetch data from Notion API for the specified database
  let response = UrlFetchApp.fetch('https://api.notion.com/v1/databases/' + notionTimeDBId + "/query", options);
  let responseJson = JSON.parse(response.getContentText());
  let responseResults = responseJson["results"];

  // Check if the register exists; create a new one if not
  let registerExists = responseResults.length > 0;
  if (!registerExists) {
    responseResults = [createRegister()];
  }

  // Extract parent block ID and fetch child blocks
  let parentId = responseResults[0]["id"];
  let blockResponse = UrlFetchApp.fetch("https://api.notion.com/v1/blocks/" + parentId + "/children", blockOptions);
  let blockResponseJson = JSON.parse(blockResponse.getContentText());
  let firstBlock = blockResponseJson["results"][0];
  let registerBlockId = firstBlock["id"];

  // Parse and adjust status data from the retrieved block
  let registerStatus = JSON.parse(firstBlock["paragraph"]["rich_text"][0]["plain_text"].replaceAll("\n", "\\n"));
  let statusKeys = Object.keys(registerStatus);

  // Convert certain string values to their corresponding types
  for (let i = 0; i < statusKeys.length; i++) {
    let currKey = statusKeys[i];
    if (registerStatus[currKey] == "true") {
      registerStatus[currKey] = true;
    }
    if (registerStatus[currKey] == "false") {
      registerStatus[currKey] = false;
    }
    if (registerStatus[currKey] == "null") {
      registerStatus[currKey] = null;
    }
  }

  // Return status data and block ID
  return { status: registerStatus, blockId: registerBlockId };
}

// Function to set the state register in Notion
function setStateRegister(active, projId, desc, start) {
  // Fetch projects from Notion
  let projects = notionGetProjects();
  var notionPageId = null;

  // Determine Notion page ID if a project ID is provided
  if (projId != null) {
    notionPageId = projects.find(x => x.name === projId).pageId;
  }

  // Get the block ID from the current state register
  let blockId = getStateRegister()["blockId"];

  // Define payload for updating the Notion block with new state information
  let payload = {
    "type": "paragraph",
    "paragraph": {
      "rich_text": [{
        "type": "text",
        "text": {
          "content": '{"timerActive":"' + active + '","projectId":"' + projId + '","description":"' + desc + '","start":"' + start + '","notionPageId":"' + notionPageId + '"}',
          "link": null
        }
      }],
      "color": "default"
    }
  }

  // Set up options for the HTTP request to update the Notion block
  let options = {
    "method": 'patch',
    headers: {
      "Content-Type": "application/json",
      "Notion-Version": "2022-02-22",
      "Authorization": "Bearer " + notionToken
    },
    "payload": JSON.stringify(payload)
  }

  // Perform the update operation on the Notion block
  UrlFetchApp.fetch('https://api.notion.com/v1/blocks/' + blockId, options);
}

// Function to create a new register in Notion
function createRegister() {
  // Define payload for creating a new page in the Notion database
  let createPayload = {
    "parent": { "database_id": notionTimeDBId },
    "properties": {
      "Description": {
        "title": [
          {
            "text": {
              "content": "Setup - Do Not Delete This Entry"
            }
          }
        ]
      },

      "Date": {
        "id": "",
        "type": "date",
        "date": {
          "start": new Date('2000-04-01').toISOString(),
          "time_zone": null
        }
      }
    }
  };

  // Set up options for the HTTP request to create a new page
  let createEntryOptions = {
    "method": 'post',
    headers: {
      "Content-Type": "application/json",
      "Notion-Version": "2022-02-22",
      "Authorization": "Bearer " + notionToken
    },
    "payload": JSON.stringify(createPayload)
  };

  // Perform the create operation on the Notion database
  let createResponse = UrlFetchApp.fetch('https://api.notion.com/v1/pages', createEntryOptions);
  let createResponseJson = JSON.parse(createResponse.getContentText());
  let createdPageId = createResponseJson.id;

  // Define payload for updating the content of the newly created page
  let contentPayload = {
    "children": [{
      "type": "paragraph",
      "paragraph": {
        "rich_text": [{
          "type": "text",
          "text": {
            "content": '{"timerActive":"false","projectId":"null","description":"null","start":"null","notionPageId":"null"}',
            "link": null
          }
        }],
        "color": "default"
      }
    }]
  }

  // Set up options for the HTTP request to update the content of the page
  let contentOptions = {
    "method": 'patch',
    headers: {
      "Content-Type": "application/json",
      "Notion-Version": "2022-02-22",
      "Authorization": "Bearer " + notionToken
    },
    "payload": JSON.stringify(contentPayload)
  }

  // Perform the update operation on the content of the created page
  UrlFetchApp.fetch('https://api.notion.com/v1/blocks/' + createdPageId + "/children", contentOptions);

  // Return the response JSON from the create operation
  return createResponseJson;
}


// Function to start a new timer for a specific project and timestamp
function startNewTimer(projId, currTS) {
  // Retrieve the current status from the state register
  let status = getStateRegister()["status"];

  // Check if a timer is already active; stop it if true
  if (Boolean(status["timerActive"])) {
    stopTimer();
  }

  // Set the new state in the register to start the timer for the specified project
  setStateRegister(true, projId, "---", currTS);
}

// Function to retrieve a list of projects from Notion database
function notionGetProjects() {
  var projects = [];
  var recursive = true;
  var cursor = null;
  var payload = { "": "" };

  // Iterate through Notion database to fetch projects
  while (recursive) {
    if (cursor != null) {
      payload = JSON.stringify({ "start_cursor": cursor });
    }

    // Set up options for the HTTP request to query Notion database
    let options = {
      "method": 'post',
      headers: {
        "Content-Type": "application/json",
        "Notion-Version": "2022-02-22",
        "Authorization": "Bearer " + notionToken
      },
      "payload": payload
    }

    // Fetch data from Notion API for the specified projects database
    let response = UrlFetchApp.fetch('https://api.notion.com/v1/databases/' + notionProjectsDBId + "/query", options);
    let responseJson = JSON.parse(response.getContentText());

    // Process the response and populate the projects array
    for (let i = 0; i < responseJson["results"].length; i++) {
      let projName = responseJson["results"][i]["properties"]["Name"]["title"][0]["plain_text"];
      let pageId = responseJson["results"][i]["id"];
      projects.push({ "name": projName, "pageId": pageId });
    }

    // Check if there are more results to fetch
    recursive = responseJson["has_more"];
    cursor = responseJson["next_cursor"];
  }

  // Sort the projects alphabetically
  projects.sort(function (a, b) {
    const nameA = a.name.toUpperCase(); // ignore upper and lowercase
    const nameB = b.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });

  // Return the sorted projects array
  return projects;
}

//function to get the id of a dtabase property
function getDBPropertyId(dbid, propertyName) {
  let blockOptions = {
    "method": 'get',
    headers: {
      "Content-Type": "application/json",
      "Notion-Version": "2022-02-22",
      "Authorization": "Bearer " + notionToken
    }
  }

  let getDB = UrlFetchApp.fetch("https://api.notion.com/v1/databases/" + dbid, blockOptions);
  let dbResponse = JSON.parse(getDB.getContentText());
  let propertyId = dbResponse["properties"][propertyName].id
  return propertyId
}

// Function to post a time record to Notion
function notionPostTimeRecord(projId, description, start, end) {
  // If description is null, replace it with '---'
  if (description == null) {
    var description = "---";
  }

  // Define the data payload for creating a new page in the Notion time database
  let pageData = {
    "parent": {
      "database_id": notionTimeDBId
    },
    "properties": {
      "Description": {
        "title": [
          {
            "text": {
              "content": description
            }
          }
        ]
      },
      "Projects": {
        "id": getDBPropertyId(notionTimeDBId, "Projects"),
        "type": "relation",
        "relation": [
          {
            "id": projId
          }
        ],
        "has_more": false
      },
      "Date": {
        "type": "date",
        "date": {
          "start": start,
          "end": end,
          "time_zone": null
        }
      }
    }
  }

  // Set up options for the HTTP request to create a new page in the Notion time database
  let options = {
    "method": 'post',
    headers: {
      "Content-Type": "application/json",
      "Notion-Version": "2022-02-22",
      "Authorization": "Bearer " + notionToken
    },
    "payload": JSON.stringify(pageData)
  }

  // Perform the create operation on the Notion time database
  let response = UrlFetchApp.fetch('https://api.notion.com/v1/pages', options);
  let responseJson = JSON.parse(response.getContentText());

  // Log the response for debugging purposes
  console.log(responseJson);
}


// Function to stop the active timer
function stopTimer() {
  // Retrieve the current status from the state register
  let status = getStateRegister()["status"];

  // Log the current status for debugging purposes
  console.log(status);

  // Post a time record with the current timer status to Notion
  notionPostTimeRecord(status["notionPageId"], status["description"], status["start"], toIsoUTCOffsetString(new Date()));

  // Set the state in the register to indicate that the timer is now inactive
  setStateRegister(false, null, null, null);
}

// Function to update the description of the active timer
function updateDescription(des) {
  // Retrieve the current status from the state register
  let status = getStateRegister()["status"];

  // Set the new state in the register with the updated description
  setStateRegister(Boolean(status["timerActive"]), status["projectId"], des, status["start"]);
}


// Function to retrieve previous descriptions for a given project
function getPreviousDescriptions(projId) {
  // Load the HTML row template for used descriptions
  let desRowTemplate = HtmlService.createHtmlOutputFromFile("listDescRowTemplate").getContent();

  // Retrieve the list of projects from Notion
  let projects = notionGetProjects();

  // Initialize variables to store Notion page ID, descriptions, and pagination parameters
  var notionPageId = null;
  var descriptions = [];
  var recursive = true;
  var cursor = null;

  // If a specific project ID is provided, find its Notion page ID
  if (projId != null) {
    notionPageId = projects.find(x => x.name === projId).pageId;

    // Define the payload for querying Notion database based on project and date filter
    let payload = {
      "filter": {
        "and": [
          {
            "property": "Projects",
            "relation": {
              "contains": notionPageId
            }
          },
          {
            "property": "Date",
            "date": {
              "past_year": {}
            }
          }
        ]
      }
    }

    // Continue fetching results while there are more pages
    while (recursive) {
      // Update payload with cursor if not null
      if (cursor != null) {
        payload = {
          "start_cursor": cursor,
          "filter": {
            "and": [
              {
                "property": "Projects",
                "relation": {
                  "contains": notionPageId
                }
              },
              {
                "property": "Date",
                "date": {
                  "past_year": {}
                }
              }
            ]
          }
        }
      }

      // Define options for fetching data from Notion
      let options = {
        "method": 'post',
        headers: {
          "Content-Type": "application/json",
          "Notion-Version": "2022-02-22",
          "Authorization": "Bearer " + notionToken
        },
        "payload": JSON.stringify(payload)
      }

      // Fetch data from Notion database
      let response = UrlFetchApp.fetch('https://api.notion.com/v1/databases/' + notionTimeDBId + "/query", options);

      // Parse the JSON response
      let responseJson = JSON.parse(response.getContentText());

      // Process each result and extract descriptions
      for (let i = 0; i < responseJson["results"].length; i++) {
        let description = responseJson["results"][i]["properties"]["Description"]["title"][0]["plain_text"];
        descriptions.push(description);
      }

      // Update pagination parameters
      recursive = responseJson["has_more"];
      cursor = responseJson["next_cursor"];
    }

    // Deduplicate and limit the list of descriptions to the last 15 entries
    let uniqueDescriptions = Array.from(new Set(descriptions));
    uniqueDescriptions = uniqueDescriptions.reverse().slice(0, 15);

    // Create HTML rows for the used descriptions
    let usedDesHTMLRows = [];
    for (let i = 0; i < uniqueDescriptions.length; i++) {
      usedDesHTMLRows.push(desRowTemplate.replaceAll("##USEDDES##", uniqueDescriptions[i].replaceAll("\n", '<br>')));
    }

    // Generate the final HTML for the list of used descriptions
    let uniqueDescriptionsHTML = '<ul class="list-group" style="padding: 15px">' + usedDesHTMLRows.join("\n") + '</ul>';

    // Return both the raw list and the HTML representation of used descriptions
    return [uniqueDescriptions, uniqueDescriptionsHTML];
  }
}

// Function to convert a date to ISO string with UTC offset
function toIsoUTCOffsetString(date) {
  var tzo = -date.getTimezoneOffset(),
    dif = tzo >= 0 ? '+' : '-',
    pad = function (num) {
      return (num < 10 ? '0' : '') + num;
    };

  // Format date to ISO string with UTC offset
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    dif + pad(Math.floor(Math.abs(tzo) / 60)) +
    ':' + pad(Math.abs(tzo) % 60);
}
