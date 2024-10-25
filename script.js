// ==UserScript==
// @name        Youtube: Youtube Limit
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/*
// @grant       none
// @version     1.0
// @author      woynert
// @description 10/22/2024, 12:10:40 PM
// @grant GM_addStyle
// @grant GM_getValue
// @grant GM.getValue
// @grant GM.setValue
// @grant GM_setValue
// @grant GM_registerMenuCommand
// @grant unsafeWindow
// @run-at document-start
// ==/UserScript==

// ===========================================
// Data
// ===========================================

/*
 * struct Record:
 *   intance_id: int
 *   elapsed_time: int
 *
 * struc RecordData:
 *   day: int
 *   records: Array[Record]
 *   minute_message_launched: Array[int] # each int represents the message for 5,4,3,2,1 minutes
 */

const state = {
  // loop

  PROCESS_TICK_RATE: 1,
  ticks: 0,
  debugging: false,

  // timer

  TIME_LIMIT_MS: 1000 * 60 * 60, // one hour
  INSTANCE_ID: getRandomInt(65535),
  total_elapsed_time: 0,
  chunk_time_start: Date.now(), // the time where we start counting time (updated each time we save)
  chunk_elapsed_time: 0,
  was_video_playing: false,
  visual_last_saved_time: 0,

  // IO

  SAVE_EVERY_TICKS: 5,
  DATA_KEY: "woy_record_data",
  CHECK_MESSAGE_EVERY_TICKS: 15,
  last_read_data: null, // cache remote data

  // DOM UI

  controls_were_injected: false,
  video_is_hidden: false,

  video_element: null,
  style_element: null,
  button_element: null,
  label_element: null,
};

// ===========================================
// Loop / Time Tracking
// ===========================================

function debug(text) {
  if (!state.debugging) return;
  console.log(`woy: youtube limit: ${text}`);
}

function debug_error(error) {
  if (!state.debugging) return;
  console.error(error);
}

function setup() {
  debug("running setup");
}

function process() {
  // setup
  if (!isVideoElementValid()) {
    getVideoElement();
    return;
  }

  if (!state.controls_were_injected && readyToInject()) {
    setupInjection();
    state.controls_were_injected = true;
  }

  // poll latest data
  readData();
  let absolute_time = getAbsoluteElapsedTime();

  // track time
  if (isVideoPlaying()) {
    if (!state.was_video_playing) {
      state.was_video_playing = true;
      state.chunk_time_start = Date.now();
    }

    calculateTime();

    // write
    if (state.ticks % state.SAVE_EVERY_TICKS == 0) {
      writeElapsedTime();
    }

    // little time left alert
    if (state.ticks % state.CHECK_MESSAGE_EVERY_TICKS == 0) {
      fireAlertMessage();
    }

    // hide video when limit is reached
    if (absolute_time >= state.TIME_LIMIT_MS) {
      hideVideo();
    }
  } else {
    state.was_video_playing = false;
  }

  // update visuals
  // TODO: Update only when window is visible
  if (state.controls_were_injected) {
    // update label

    setLabelText(formatMilliseconds(absolute_time));

    // update style when limit is reached
    // TODO: Do not run each frame
    if (absolute_time >= state.TIME_LIMIT_MS) {
      state.button_element.parentElement.classList.add(
        "woy-yt-timer__container-limited",
      );
    }
  }

  //debug(`playing? ${isVideoPlaying()}\nchunk ${formatMilliseconds(getLocalElapsedTime())}\nstored ${formatMilliseconds(readTotalStoredTime())}\nstored-curr ${formatMilliseconds(getAbsoluteElapsedTime())}`)
}

async function processLoop() {
  while (true) {
    process();
    state.ticks += 1;
    await sleep(1000 / state.PROCESS_TICK_RATE);
  }
}

// @returns boolean
function isVideoElementValid() {
  if (state.video_element == null) {
    return false;
  }
  /*if (!state.video_element.checkVisibility()){
    return false
  }*/
  if (!state.video_element.isConnected) {
    return false;
  }
  return true;
}

function getVideoElement() {
  state.video_element = document.querySelector(
    ".video-stream.html5-main-video",
  );
}

// @returns boolean
function isVideoPlaying() {
  if (
    !document.hidden &&
    !state.video_element.paused &&
    !state.video_is_hidden
  ) {
    return true;
  }
  return false;
}

function calculateTime() {
  var curr_time = Date.now();

  state.chunk_elapsed_time = curr_time - state.chunk_time_start;
  state.chunk_time_start = curr_time;
  state.total_elapsed_time += state.chunk_elapsed_time;
}

function getLocalElapsedTime() {
  return state.total_elapsed_time + state.chunk_elapsed_time;
}

function getAbsoluteElapsedTime() {
  return (
    readTotalStoredTime() + getLocalElapsedTime() - state.visual_last_saved_time
  );
}

// ===========================================
// IO: Local Storage
// ===========================================

// updates local data cache
async function readData() {
  try {
    const raw_data = await browser.storage.local.get(state.DATA_KEY);
    if (raw_data) {
      const data = JSON.parse(raw_data[state.DATA_KEY]);
      state.last_read_data = data;
      return;
    }
  } catch (error) {
    debug_error(error);
  }

  state.last_read_data = null;
}

// @argument JSON Object
function writeData(data) {
  if (data == null) return;
  let to_store = {};
  to_store[state.DATA_KEY] = JSON.stringify(data);

  browser.storage.local.set(to_store);
}

// @argument seed: int
// @argument time: int
function writeElapsedTime(seed, time) {
  let reset_data = false;
  let data = state.last_read_data;
  let instance_id = `${state.INSTANCE_ID}`;

  // data wasn't found
  if (data == null) {
    reset_data = true;
  }

  // data has caducated
  try {
    if (data["day"] != getCurrentMonthDay()) {
      reset_data = true;
    }
  } catch (error) {
    debug_error(error);
    reset_data = true;
  }

  // reset data
  if (reset_data) {
    debug("resetting data");
    data = {
      day: getCurrentMonthDay(),
      records: {},
      minute_message_launched: [],
    };
  }

  // save record
  data["records"][instance_id] = getLocalElapsedTime();
  state.visual_last_saved_time = data["records"][instance_id];

  // write
  debug(JSON.stringify(data));
  debug(instance_id);
  writeData(data);
}

// @returns total_time: int
function readTotalStoredTime() {
  let reset_data = false;
  let data = state.last_read_data;
  let instance_id = `${state.INSTANCE_ID}`;

  try {
    let elapsed_accumulator = 0;
    let records = data["records"];

    for (let key in records) {
      if (records.hasOwnProperty(key)) {
        let number = records[key];

        if (parseInt(number) == NaN) continue;

        elapsed_accumulator += parseInt(number);
      }
    }

    return elapsed_accumulator;
  } catch (error) {
    debug_error(error);
  }

  return 0;
}

// ===========================================
// DOM Injection / Modification
// ===========================================

// @return boolean
function readyToInject() {
  let html_body = document.getElementsByTagName("body").length > 0;
  let html_head = document.getElementsByTagName("head").length > 0;
  return html_body && html_head;
}

function setupInjection() {
  let body_container = document.createElement("div");
  let general_style = document.createElement("style");
  general_style.type = "text/css";
  state.style_element = document.createElement("style");
  state.style_element.type = "text/css";

  let html_body = document.getElementsByTagName("body")[0];
  let html_head = document.getElementsByTagName("head")[0];
  html_body.appendChild(body_container);
  html_head.appendChild(general_style);
  html_head.appendChild(state.style_element);

  body_container.innerHTML = `
      <div class="woy-yt-timer__container">
        <p id="woy-yt-timer__label">00:00:00</p>
        <button type="button" id="woy-yt-timer__button">Lights On</button>
      </div>
  `;

  general_style.innerHTML = `
      .woy-yt-timer__container{
        position: fixed;
        top: 0;
        left: 0;
        z-index: 30000;
        padding: 3px;
        font-family: sans;
        font-size: 1.2em;
        background-color: #fff;
        margin: 10px;
        border-bottom: #c41e1e;
        border-bottom-width: 2px;
        border-bottom-style: solid;
        user-select: none;
        user-select: none;
      }
      .woy-yt-timer__container-limited{
        border-bottom-color: #1f820a;
      }
      #woy-yt-timer__label{
        display: inline-block;
        font-family: mono;
      }
      #woy-yt-timer__button{
        display: inline-block;
      }
  `;

  // select

  state.label_element = document.getElementById("woy-yt-timer__label");
  state.button_element = document.getElementById("woy-yt-timer__button");
  state.button_element.addEventListener("click", onButtonClick);

  // hide by default

  hideVideo();
}

function onButtonClick() {
  debug(`button clicked ${state.video_is_hidden}`);
  if (state.video_is_hidden) {
    revealVideo();
  } else {
    hideVideo();
  }
}

function hideVideo() {
  state.video_is_hidden = true;
  state.style_element.innerHTML = `
    .html5-video-container > video:first-child { display: none !important; }
  `;
  state.button_element.innerText = "Lights On";
}

function revealVideo() {
  if (getAbsoluteElapsedTime() >= state.TIME_LIMIT_MS) {
    return;
  }
  state.video_is_hidden = false;
  state.style_element.innerHTML = "";
  state.button_element.innerText = "Lights Off";
}

// @argument text: String
function setLabelText(text) {
  state.label_element.innerText = text;
}

function fireAlertMessage() {
  // are we in range for show a message?

  let absolute_time = readTotalStoredTime();
  let message_index = Math.floor(
    (state.TIME_LIMIT_MS - absolute_time) / (1000 * 60),
  );
  if (message_index > 4) {
    return;
  }
  message_index += 1; // for visual purposes
  debug(`This is the amount of time left ${message_index} minute(s)`);

  try {
    // check the message hasn't been fired

    let data = state.last_read_data;
    let messages = data["minute_message_launched"];
    if (messages.includes(message_index)) {
      debug(`Message ${message_index} has already been fired`);
      return;
    }

    // claim it, save it, fire it

    data["minute_message_launched"].push(message_index);
    writeData(data);
    alert(`Youtube Timer: Te quedan ${message_index} minutos de video`);
  } catch (error) {
    debug_error(error);
    return;
  }
}

// ===========================================
// Utils
// ===========================================

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function formatMilliseconds(duration) {
  let seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  return hours + ":" + minutes + ":" + seconds;
}

function getCurrentMonthDay() {
  // 4 hours in the past so that the reset is issued at 4 AM instead of 12 AM
  // This would prevent possible relapse after 12 AM
  return new Date(Date.now() - 1000 * 60 * 60 * 4).getDate();
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===========================================
// Init
// ===========================================

console.log("woy: youtube limit: start");
setup();
processLoop();
