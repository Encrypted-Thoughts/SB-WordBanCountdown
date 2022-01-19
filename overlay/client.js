var API_Socket = "ws://localhost:8080/";

// Start ws connection after document is loaded
$(document).ready(function () {
    connectWebsocket();
});

$("#header").fitText().fitText(1.2);
$("#bannedword").fitText().fitText(1.2);
$("#time").fitText().fitText(0.5);

// Connect to ChatBot websocket
// Automatically tries to reconnect on
// disconnection by recalling this method
function connectWebsocket() {

    //-------------------------------------------
    //  Create WebSocket
    //-------------------------------------------
    var socket = new WebSocket(API_Socket);
    var words = [];
    var countdownActive = false;
    var decrementer = 1;

    //-------------------------------------------
    //  Websocket Event: OnOpen
    //-------------------------------------------
    socket.onopen = function () {

        var auth = {
            author: "EncryptedThoughts",
            website: "twitch.tv/encryptedthoughts",
            id: "1337",
            request: "Subscribe",
            events: {
                General: [
                    "Custom"
                ]
            }
        };

        // Send authentication data to ChatBot ws server
        socket.send(JSON.stringify(auth));
    };

    //-------------------------------------------
    //  Websocket Event: OnMessage
    //-------------------------------------------
    socket.onmessage = function (message) {

        var socketMessage = JSON.parse(message.data);
        console.log(socketMessage);

        if (socketMessage.event && socketMessage.event.source === "None" && socketMessage.event.type === "Custom") {

            switch (socketMessage.data.name) {
                case "EVENT_WORD_BAN_START":
                    let index = words.findIndex(w => w.word === socketMessage.data.word);
                    if (index > -1) {
                        words[index].seconds += socketMessage.data.seconds;
                    }
                    else
                        words.push(socketMessage.data);

                    if (!countdownActive) 
                        StartTimer(words[0], $('#time'));
                    break;
                case "EVENT_WORD_BAN_RESET_TIME":
                    if (words.length > 0) 
                        words[0].seconds = words[0].seconds - (words[0].seconds % socketMessage.data.seconds) + socketMessage.data.seconds;
                    break;
                case "EVENT_WORD_BAN_ADD_TIME":
                    if (words.length > 0)
                        words[0].seconds = words[0].seconds + socketMessage.data.seconds;
                    break;
                case "EVENT_WORD_BAN_SET_TIME":
                    if (words.length > 0)
                        words[0].seconds = socketMessage.data.seconds;
                    break;
                case "EVENT_WORD_BAN_PAUSE":
                    decrementer = 0;
                    break;
                case "EVENT_WORD_BAN_UNPAUSE":
                    decrementer = 1;
                    break;
                case "EVENT_WORD_BAN_END":
                    playSuccess = false;
                    if (words.length > 0)
                        words[0].seconds = 0;
                    break;
            }
        }
    };

    //-------------------------------------------
    //  Websocket Event: OnError
    //-------------------------------------------
    socket.onerror = function (error) {
        console.log("Error: " + error);
    };

    //-------------------------------------------
    //  Websocket Event: OnClose
    //-------------------------------------------
    socket.onclose = function () {
        // Clear socket to avoid multiple ws objects and EventHandlings
        socket = null;
        // Try to reconnect every 5s
        setTimeout(function () { connectWebsocket() }, 15000);
    };

    StartTimer = function (data, display) {
        countdownActive = true;
        playSuccess = true;
        var minutes = parseInt(data.seconds / 60, 10);
        var seconds = parseInt(data.seconds % 60, 10);
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        $('#time').text(minutes + ":" + seconds);
        $('#bannedword').text(data.word);

        var interval = setInterval(function () {
            minutes = parseInt(data.seconds / 60, 10);
            seconds = parseInt(data.seconds % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            display.text(minutes + ":" + seconds);

            if (data.seconds > 0)
                data.seconds -= decrementer;
            else {
                data.seconds = 0;
                display.text("00:00");
                clearInterval(interval);
                $("body").removeClass("animate__zoomIn");
                $("body").addClass("animate__zoomOut");
                if (playSuccess)
                    PlaySound(data.finishedSFXPath, data.finishedSFXVolume);

                setTimeout(function () {
                    words.shift();
                    if (words.length > 0)
                        StartTimer(words[0], $('#time'));
                }, words[0].delay);
            }
        }, 1000);

        $("body").css('visibility', 'visible');
        $("body").removeClass("animate__zoomOut");
        $("body").addClass("animate__zoomIn");
    }

    var playSuccess = true;
    PlaySound = function (path, volume) {
        var audio = new Audio(path);
        audio.volume = volume;
        audio.loop = false;
        audio.play();
    }

}
