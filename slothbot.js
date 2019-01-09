const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const readline = require("readline");

const client = new Discord.Client();

var playQueue = [];
var playing = false;
var currentStream = null;
var stream = null;
var valid = true;
var url = "";
var playable = true;
var length = 0;
var max = 10;
var title = "";
var preload = "";
var vchannel = "";

client.on("ready", () => {
  console.log("I am ready!");
  client.user.setActivity("Nothing");
});

client.on("message", message => {
  if (message.content === "ping") {
    message.reply("pong");
  }

  if (message.content.startsWith("yplay")) {
    var link = message.content.replace("yplay", "", -1);
    /*Uses a callback function to send the function the code that should be executed 
      after that function has completed executing :) */
    checkDr(link, function(validDr) {
      if (validDr) {
        console.log("valid link");
        if (playing == false) {
          const channel = message.member.voiceChannel;
          vchannel = channel;
          channel.join().then(connection => {
            currentStream = connection;
            GetDl(link, connection);
          });
          joined = true;
          message.channel.send("Playing " + title + " :)");
        } else {
          ytdl.getInfo(link, function(err, info) {
            message.channel.send("Added " + info.title + " to queue");
            playQueue.push({
              Link: link,
              User: message.author.username,
              Title: info.title
            });
          });
          if (preload == false) {
            preGetDl(link);
          }
        }
      } else {
        message.reply(
          "That is not a valid youtube link try again or duration is not under 10mins"
        );
      }
    });
  }

  if (message.content === "next") {
    if (message.member.hasPermission("ADMINISTRATOR")) {
      stream.end();
    } else {
      message.reply("You do not have the correct permission");
    }
  }

  if (message.content === "q" || message.content === "queue") {
    var response = "";
    if (is_queue_empty()) {
      response = "the queue is empty.";
    } else {
      var long_queue = playQueue.length > 30;
      for (var i = 0; i < (long_queue ? 30 : playQueue.length); i++) {
        response +=
          '"' +
          playQueue[i]["Title"] +
          '" (requested by ' +
          playQueue[i]["User"] +
          ")\n";
      }

      if (long_queue)
        response += "\n**...and " + (playQueue.length - 30) + " more.**";
    }
    message.reply(response);
  }

  if (message.content.startsWith("remove")) {
    if (message.member.hasPermission("ADMINISTRATOR")) {
      var remove = message.content.replace("remove ", "", -1);
      if (is_queue_empty()) {
        message.reply("The queue is empty");
        return;
      } else {
        remove = remove - 1;
        playQueue.splice(remove, 1);
        message.reply(`The song has been deleted from queue`);
      }
    } else {
      message.reply("You do not have the correct permission");
    }
  }

  if (message.content.startsWith("test")) {
    message.reply(message.content.replace("test", "", -1));
  }
  if (message.content === "stop") {
    if (message.member.hasPermission("ADMINISTRATOR")) {
      stream.end();
    } else {
      message.reply("You do not have the correct permission");
    }
  }

  if (message.content === "leave") {
    if (message.member.hasPermission("ADMINISTRATOR")) {
      stream.end();
      playing = false;
      vchannel.leave();
    } else {
      message.reply("You do not have the correct permission");
    }
  }

  if (message.content === "purge") {
    if (message.member.hasPermission("ADMINISTRATOR")) {
      const deleteCount = parseInt(args[0], 10);

      if (!deleteCount || deleteCount < 2 || deleteCount > 100)
        return message.reply(
          "Please provide a number between 2 and 100 for the number of messages to delete"
        );

      message.channel
        .bulkDelete(deleteCount)
        .catch(error =>
          message.reply(`Couldn't delete messages because of: ${error}`)
        );
    } else {
      message.reply("You do not have the correct permission");
    }
  }

  if (message.content === "pause") {
    if (message.member.hasPermission("ADMINISTRATOR")) {
      stream.pause();
    } else {
      message.reply("You do not have the correct permission");
    }
  }

  if (message.content === "resume") {
    if (message.member.hasPermission("ADMINISTRATOR")) {
      stream.resume();
    } else {
      message.reply("You do not have the correct permission");
    }
  }
});

/*function GetStream(link, connection) {
  playing = true;
  const audio_stream = ytdl(
    link,
    { highWaterMark: 1024 * 1024 * 10 },
    { passes: 5 }
  );
  ytdl.getInfo(link, function(err, info) {
    client.user.setActivity(info.title);
  });
  connection.player.streamingData.pausedTime = 0;
  stream = connection.playStream(audio_stream);
  stream.on("end", () => {
    setTimeout(nextInQueue, 1000);
  });
}*/

function GetDl(link, connection) {
  playing = true;
  const audio_stream = ytdl(
    link,
    { quality: "highestaudio" },
    { filter: "audioonly" }
  );
  ytdl.getInfo(link, function(err, info) {
    client.user.setActivity(info.title);
  });
  ytDownload(audio_stream, connection);
}

function ytDownload(link, connection) {
  ffmpeg(link)
    .audioBitrate(128)
    .save(`${__dirname}/$song.aac`)
    .on("end", () => {
      console.log(`Donwload completed`);
      playDl(connection);
    });
}

function preGetDl(link) {
  const audio_stream = ytdl(
    link,
    { quality: "highestaudio" },
    { filter: "audioonly" }
  );
  preYtDownload(audio_stream);
}

function preYtDownload(link) {
  ffmpeg(link)
    .audioBitrate(128)
    .save(`${__dirname}/$song2.aac`)
    .on("end", () => {
      console.log(`Donwload completed`);
      preload = true;
    });
}

function playDl(connection) {
  if (preload == false) {
    connection.player.streamingData.pausedTime = 0;
    stream = connection.playFile(`${__dirname}/$song.aac`);
  } else {
    preload = false;
    if (playQueue.length > 0) {
      link = playQueue[0]["Link"];
      preGetDl(link);
    }
    connection.player.streamingData.pausedTime = 0;
    stream = connection.playFile(`${__dirname}/$song.aac`);
  }
  stream.on("end", () => {
    if (preload == true) {
      fs.unlinkSync(`${__dirname}/$song.aac`);
      fs.renameSync(`${__dirname}/$song2.aac`, `${__dirname}/$song.aac`);
      setTimeout(nextInQueue, 100);
    } else {
      fs.unlinkSync(`${__dirname}/$song.aac`);
      setTimeout(nextInQueue, 100);
    }
  });
}

function nextInQueue() {
  if (preload == false) {
    if (playQueue.length > 0) {
      link = playQueue[0]["Link"];
      playQueue.splice(0, 1);
      GetDl(link, currentStream);
    } else {
      stream.end();
      playing = false;
      vchannel.leave();
      playQueue.splice(0, 1);
      client.user.setActivity("Nothing");
    }
  } else {
    link = playQueue[0]["Link"];
    ytdl.getInfo(link, function(err, info) {
      client.user.setActivity(info.title);
    });
    playQueue.splice(0, 1);
    playDl(currentStream);
  }
}

function is_queue_empty() {
  return playQueue.length === 0;
}

function checkDr(url, IsDrValid) {
  validateYouTubeUrl(url, function(validURL) {
    if (validURL) {
      ytdl.getInfo(url, function(err, info) {
        length = info.length_seconds;
        length = length / 60;
        itle = info.title;
        console.log(length);
        if (length < max) {
          console.log("ytdl.getinfo()... returning true");
          IsDrValid(true);
        } else {
          console.log("ytdl.getinfo()... returning false");
          IsDrValid(false);
        }
      });
    } else {
      console.log("ytdl.getinfo()... returning false");
    }
  });
}

function validateYouTubeUrl(url, IsUrlValid) {
  if (url != undefined || url != "") {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[2].length == 11) {
      console.log("validate()... returning true ");
      IsUrlValid(true);
    } else {
      console.log("validate()... returning false ");
      IsUrlValid(false);
    }
  } else {
    console.log("validate()... returning false ");
    IsUrlValid(false);
  }
}
