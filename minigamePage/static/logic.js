
// Import the functions used by logic.js within framework.js
import {UIButton, screenToWorldSpace, UIRect, SCENES, loseLevel} from "./framework.js";

// Define and export the variables from logic.js for framework.js
export var startScene;
export var windowAmount;
export var windowStates = [];
export var difficulty;
export var energyWasted;
var gameover;
const scoreMultiplier = 60; // what difficulty should be multiplied by to calculate points

const userID = getCookie("login"); // get the userID from the cookie
if (userID == undefined || userID == "") { // if they are not logged in redirect them to the login page
  alert("Please login to play the game!");
  window.location.href = "/login/";
}

// function to change the state of the variables used by the game each frame
export function logicUpdate() {
    if (Math.random() > (1-(difficulty/10))) {
        var index = 1+Math.floor(Math.random() * (windowAmount-1))
        windowStates[index] = 1
        SCENES.game.UI.buttons[index].resetColor("#eebb33");
    }
    difficulty += 0.00006

    if (energyWasted > 15000) {
      if (!gameover) {
        gameover = true;
        loseLevel()
        SCENES.game.UI.loss_menu.text[1].resetText("You scored "+String(Math.floor(scoreMultiplier * difficulty))+" points")
      }
    }
    else {
      SCENES.game.UI.text[1].resetText(String(Math.floor(scoreMultiplier * difficulty))+" points")
      for (let i = 0; i < windowAmount; i++) {
        if (windowStates[i] == 1) {
          energyWasted += 1
          SCENES.game.UI.sprites[5].resetwidth(screenToWorldSpace(0.4*energyWasted/15000,0.052)[0])
        }
      }
    }
  }


// function to initialise the value of the variables used by the game
export function start() {
    startScene = "main_menu";
    windowAmount = 42;
    difficulty = 0; // difficulty starts at 0
    energyWasted = 0;
    gameover = false;
    SCENES.game.UI.sprites[5].resetwidth(screenToWorldSpace(0,0.052)[0]) // set the width of the energy bar to 0
    SCENES.game.UI.text[1].resetText("0 points") // set the score displayed to 0

    // set all window states to 0
    for (let i = 1; i < windowAmount; i++) {
        windowStates[i] = 0
        SCENES.game.UI.buttons[i].resetColor("#666666"); // set the color of the window to grey
    }
}

// function to change the state of a window upon it being clicked
export function clickWindow(index) {
    if (windowStates[index-2] == 1) { // if the window is on
        windowStates[index-2] = 0; // turn it off
        SCENES.game.UI.buttons[index-2].resetColor("#666666"); // set the color of the window to grey
    }
    else { // if the window is off
        windowStates[index-2] = 1; // turn it on
        SCENES.game.UI.buttons[index-2].resetColor("#eebb33"); // set the color of the window to yellow
    }
}

// function to add the score to the user in the database
function addScore() {
  var score = Math.floor(scoreMultiplier * difficulty); // calculate the score
  // get the current score of the user
  var request = "../userDB/getUserById?id="+String(userID) // get user details from their id
  getRequest(request)
  .then(response => {
    var currentscore = parseInt(response["score"]); // get the score attribute from the json

    // add the score to the current score
    var request = '../userDB/updateUser?id='+String(userID)+'&score='+String(score+currentscore) // use updateUser in contentDB
    getRequest(request)
    .then(response => {
      console.log(response);
    })
  })
}

// function to make a get request and return the response
async function getRequest(request) {
  try {
    const response = await fetch(request);
    if (!response.ok) {
      throw new Error('Request failed');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// function to get the cookie of a given name
function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
          c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
      }
  }
  return "";
}

// function at the end of the game to update the score, location of a user and redirect them to the map
export function finish() {
  addScore();

  // advance the user's target location
  // fetch the all the locations
  var locations = [];
  var currentLocationId = -1;

  function waitForLocations() {
    console.log("wait for locations", locations, currentLocationId);

    if (locations.length == 0 || currentLocationId === -1) {
        // locations aren't loaded, so wait
        setTimeout(() => {
            waitForLocations();
        },100);
    } else {
      //the locations are loaded and we have the user's location
      advanceLocation();
    }
  }

  function advanceLocation() {
    console.log("advance location");
    const currentLocationIndex = locations.findIndex((e) => { return e == currentLocationId; });
    var newLocationId;

    // if it is the last one or beyond the list, wrap around
    if (currentLocationIndex >= locations.length - 1) { newLocationId = locations[0]; }
    else { 
      // go to the next location
      newLocationId = locations[currentLocationIndex+1];
    }

    console.log(currentLocationIndex, currentLocationId, newLocationId);
    fetch("/userDB/updateUserTargetLocation?id="+userID+"&location="+newLocationId,{method: "GET"}).then((response) => {
      // once the change has happened, redirect
      window.location.href="/map/";
    });
  }

  fetch("/contentDB/getAllLocations", {method: "GET"})
  .then((response) => response.json())
  .then((json) => {
    console.log("locations got back", locations);
    json["locations"].forEach(e => {
      locations.push(e["id"]);
    });
  })

  // fetch the location the user is at
  fetch("/userDB/getUserTargetLocation?id="+userID, {method: "GET"})
  .then((response) => response.json())
  .then((json) => {
    console.log("player location got back:", json);
    currentLocationId = json["location"];
  })

  // wait for the fetches to ccome back
  waitForLocations();
}