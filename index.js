const {
	default: WASocket,
	DisconnectReason,
	useSingleFileAuthState,
	makeInMemoryStore,
	fetchLatestBaileysVersion,
} = require("@adiwajshing/baileys");
const Pino = require("pino");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path").join;
const moment = require("moment-timezone");
const { Boom } = require("@hapi/boom");
const axios = require("axios").default;
let sock;
const { session, timezone, idgas } = require("./config.json");
const { state, saveState } = useSingleFileAuthState(path(__dirname, `./${session}`), Pino({ level: "silent" }));

const kirimWA = cron.schedule(
	"*/1 * * * *",
	async () => {	
		axios
			  .get('https://script.google.com/macros/s/${IDGAS}/exec?aksi=0')
			  .then(res => {
				//console.log(`statusCode: ${res.status}`)
				if (res.data.success){
					let arr=((res.data.rows))
					if (arr.length>0){
						arr.forEach(element => {													
						  let tglk=element.Timestamp;
						  let namal=element['Nama Lengkap'];
						  let nipa=element['Nomor Induk Kependudukan'];
						  let adda=element['Alamat'];
						  let kua=element['Nama KUA'];
						  let hal=element['Layanan yang diadukan'];
						  let detail=element['Deskripsi Pengaduan'];
						  let emaia=element.Email;
						  let doca=element['Dokumen Pendukung (Tidak Wajib Diisi)'];
						  let ida=element['ID'];
						  let notelp=element['Nomor Handphone (whatsapp)'];
						  let sta=element['Status'];
						  notelp='62'+parseInt(notelp).toString();
					          console.log(idgas)
						  let url=`https://script.google.com/macros/s/AKfycbx_8bYVc5XDXUWxlpADzGdMsym0oITdOHEwI80TMIYz4wngwwzYUc_IbmtYneY0rC6R/exec?aksi=2&kdkua=${kua}`;						  
						  if (sta==0){
								let message=`🙏 Bapak/Ibu/Sdr. *${namal}*,\n\nPengaduan anda telah kami terima dengan nomor resi *${ida}*, segera akan kami tidak lanjuti.\n\nTerima kasih\n\n*Biro Hukum*\n*Asosiasi Penghulu RI*`
								sock.sendMessage(`${notelp}@s.whatsapp.net`, { text: message });
								//balasan ke pengirin aduan
								axios.get(url).then(res1 => {
									if (res1.data.success){
										let arr=((res1.data.rows))
										let nokua=arr[0]['NO TELP']
										nokua='62'+parseInt(nokua).toString();
										let balasaduan=`🗣 KUA *${kua}* mendapat pengaduan dari masyarakat perihal *${hal}*, dengan detail: *${detail}*\n\nTerima kasih\n\n*Biro Hukum*\n*Asosiasi Penghulu RI*`;
										sock.sendMessage(`${nokua}@s.whatsapp.net`, { text: balasaduan });
										
									}
									let urlupd =`https://script.google.com/macros/s/AKfycbx_8bYVc5XDXUWxlpADzGdMsym0oITdOHEwI80TMIYz4wngwwzYUc_IbmtYneY0rC6R/exec?aksi=1&id=${ida}`;
										axios.get(urlupd).then(res => {
											if (res.data.success){
												console.log(res.data)
											}
									});
								})

						  }
						  //await msg.reply(text);
						  //console.log(color("[CRON]", "yellow"), "Reset all limit");
						});
					}
				}
			  })
			  .catch(error => {
				console.error(error)
			  })
	},
	{ scheduled: true, timezone }
);
kirimWA.start();
const connect = async () => {
	let { version, isLatest } = await fetchLatestBaileysVersion();
	
	//	.log(`Using: ${version}, newer: ${isLatest}`);
	sock = WASocket({
		printQRInTerminal: true,
		auth: state,
		logger: Pino({ level: "silent" }),
		version,
	});
	
	// creds.update
	sock.ev.on("creds.update", saveState);
	// connection.update
	sock.ev.on("connection.update", async (up) => {
		
		const { lastDisconnect, connection } = up;
		if (connection) {
			console.log("Connection Status: ", connection);
		}
		if (connection === "close") {
			let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
			if (reason === DisconnectReason.badSession) {
				console.log(`Bad Session File, Please Delete ${session} and Scan Again`);
				sock.logout();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log("Connection closed, reconnecting....");
				connect();
			} else if (reason === DisconnectReason.connectionLost) {
				console.log("Connection Lost from Server, reconnecting...");
				connect();
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First");
				sock.logout();
			} else if (reason === DisconnectReason.loggedOut) {
				console.log(`Device Logged Out, Please Delete ${session} and Scan Again.`);
				sock.logout();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log("Restart Required, Restarting...");
				connect();
			} else if (reason === DisconnectReason.timedOut) {
				console.log("Connection TimedOut, Reconnecting...");
				connect();
			} else {
				sock.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);
			}
		}
	});
	// messages.upsert
	sock.ev.on("messages.upsert", async (m) => {
		//chatHandler(m, sock);
	});
	// group-participants.update
	sock.ev.on("group-participants.update", (json) => {
		//joinHandler(json, sock);
	});
};
connect();
