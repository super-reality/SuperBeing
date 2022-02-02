import { existsSync } from "fs";
import customConfig from "../utilities/customConfig.js";
import { warn } from "../utilities/logger.js";

export function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Empty responses in-case of an agent error in order to avoid crashing the client bots
export const emptyResponse = [ 
    'Idk',
    'You tell me',
    'If you tell me, we will both know',
    'It\'s a secret',
    'Some things you should figure by your self',
    'No you',
    'I don\'n know'
]
export function getRandomEmptyResponse() {
  return emptyResponse[getRandomNumber(0, emptyResponse.length - 1)]
}

export function startsWithCapital(word){
  return word.charAt(0) === word.charAt(0).toUpperCase()
}

export function getOS() {
  const platform = process.platform;
  let os;
  if (platform.includes('darwin')) {
    os = 'Mac OS';
  } else if (platform.includes('win32')) {
    os = 'Windows';
  } else if (platform.includes('linux')) {
    os = 'Linux';
  }

  return os;
}

//returns the Chrome path for puppeteer based on the OS
export function detectOsOption() {
  const os = getOS();
  const options = {executablePath: null};
  let chromePath = '';
  switch (os) {
      case 'Mac OS':
          chromePath = '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome';
          break;
      case 'Windows':
          chromePath = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
          break;
      case 'Linux':
          chromePath = '/usr/bin/google-chrome';
          break;
      default:
          break;
  }

  if (chromePath) {
      if (existsSync(chromePath)) {
          options.executablePath = chromePath;
      }
      else {
          warn("Warning! Please install Google Chrome to make bot workiing correctly in headless mode.\n");
      }
  }
  return options;
}

export function convertLocalToUtcTimezone(date) {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

export function capitalizeFirstLetter(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function clamp(value, min, max) {
  if (value < min) {
    return min;
  } else if (value > max) {
    return max;
  } else {
    return value;
  }
}

export function IsJsonString(str) {
  try {
      JSON.parse(str);
  } catch (e) {
      return false;
  }
  return true;
}

export function getRandomTopic() {
  const topics = customConfig.instance.get('discussion_channel_topics').split('|');
  return topics[getRandomNumber(0, topics.length - 1)];
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function randomFloat(min, max) {
  return Math.random() * (max - min + 1) + min;
}

export function clientSettingsToInstance(settings) {
  let res = [];

  for (let i = 0; i < settings.length; i++) {
    res = addSettingForClient(res, settings[i].client, { _name: settings[i].name, _value: settings[i].defaultValue });
  }

  return res;
}

export function addSettingForClient(array, client, setting) {
  for (let i = 0; i < array.length; i++) {
    if (array[i].client === client) {
      array[i].settings.push({ name: setting._name, value: setting._value });
      return array;
    }
  }

  array.push({ client: client, enabled: false, settings: [{ name: setting._name, value: setting._defaultValue }] });
  return array;
}

export function getSetting(settings, key) {
  for (let i = 0; i < settings.length; i++) {
    if (settings[i].name === key) {
      return settings[i].value;
    }
  }

  return undefined;
}