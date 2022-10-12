let localStream;
let remoteStream;
let peerConnection;

let uid = String(Math.floor(Math.random() * 10000));

const WEBSOCKET_URL = "ws://10.20.1.169:8888/socket/signal";
let webSocket;
let channelId = "signal_channel_979ef240-ab56-4c09-904c-056c1eb26254";

let servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

let init = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  document.getElementById("user-1").srcObject = localStream;

  webSocket = new WebSocket(WEBSOCKET_URL);

  webSocket.onmessage = (message) => {
    messageData = JSON.parse(message.data);
    console.log("MESSAGE RECEIVED:", messageData);

    switch (messageData.type) {
      case "MESSAGE_TYPE_JOIN":
        handlePeerJoined(messageData.from);
        break;

      case "MESSAGE_TYPE_OFFER":
        let offer = messageData.data;
        createAnswer(offer, messageData.from);
        break;

      case "MESSAGE_TYPE_ICE":
        if (peerConnection) {
          peerConnection.addIceCandidate(messageData.data);
        }
        break;

      case "MESSAGE_TYPE_ANSWER":
        addAnswer(messageData.data);
        break;

      case "MESSAGE_TYPE_TEXT":
        console.log("MESSAGE_TEXT: ", messageData);
        break;

      case "MESSAGE_TYPE_ERROR":
        alert(messageData.data);
        break;

      default:
        break;
    }
  };
};

let createPeerConnection = (sdpType, memberId) => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = async (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      let peerMessage = {
        from: uid,
        type: "MESSAGE_TYPE_ICE",
        data: event.candidate,
        to: memberId,
      };

      sendMessage(peerMessage);
    }
  };

  peerConnection.oniceconnectionstatechange = (event) => {
    const state = peerConnection.iceConnectionState;
    console.log(state);
    if (state === "disconnected") {
      peerConnection.removeStream(remoteStream);
      document.getElementById("user-2").srcObject = null;

      //leave the room
      let leaveMessage = {
        from: uid,
        type: "MESSAGE_TYPE_LEAVE",
        data: "979ef240-ab56-4c09-904c-056c1eb26254",
      };
      sendMessage(leaveMessage);
    }
  };
};

let handlePeerJoined = async (memberId) => {
  console.log("New peer has join this room: ", memberId);
  createOffer(memberId);
};

let createOffer = async (memberId) => {
  createPeerConnection("offer-sdp", memberId);

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  let offerMessage = {
    from: uid,
    type: "MESSAGE_TYPE_OFFER",
    data: offer,
    to: memberId,
  };

  sendMessage(offerMessage);
};

let createAnswer = async (offer, memberId) => {
  createPeerConnection("answer-sdp", memberId);

  if (!offer) return alert("Retrieve offer from peer first");

  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  let answerMessage = {
    from: uid,
    type: "MESSAGE_TYPE_ANSWER",
    data: answer,
    to: memberId,
  };

  sendMessage(answerMessage);
};

let addAnswer = async (answer) => {
  //   let answer = document.getElementById("answer-sdp").value;
  if (!answer) return alert("Retrieve answer from peer first...");

  //   answer = JSON.parse(answer);
  if (!peerConnection.currentRemoteDescription) {
    console.log(answer);
    peerConnection.setRemoteDescription(answer);
  }
};

let sendMessage = (message) => {
  webSocket.send(JSON.stringify(message));
};

let join = () => {
  //send join message
  console.log("JOINED THE CHANNEL");
  let joinMessage = {
    from: uid,
    type: "MESSAGE_TYPE_JOIN",
    data: getChannel(),
    token: getToken(),
    to: null,
  };

  sendMessage(joinMessage);
};

let leave = () => {
  if (peerConnection && peerConnection.iceConnectionState === "connected") {
    // localStream.stop();
    peerConnection.removeStream(localStream);
    peerConnection.close();
  }
};

let getChannel = () => {
  return document.getElementById("channel").value;
};

let getToken = () => {
  return document.getElementById("token").value;
};

init();

document.getElementById("join").addEventListener("click", join);
document.getElementById("leave").addEventListener("click", leave);
