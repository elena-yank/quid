import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-Jvp-DLvF.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var createRoom_createServerFn_handler = createServerRpc({
	id: "c08aa023accc46a0d1fbd9811a34d5434bef19a03ca91ab334d8eeb529377d28",
	name: "createRoom",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => createRoom.__executeServer(opts));
var createRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(createRoom_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).createRoom(data);
});
var joinRoom_createServerFn_handler = createServerRpc({
	id: "3797ff05af26898371182cf4b832d4c220dfd4b6f9fd89161ca9dea0be946bfd",
	name: "joinRoom",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => joinRoom.__executeServer(opts));
var joinRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(joinRoom_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).joinRoom(data);
});
var syncRoom_createServerFn_handler = createServerRpc({
	id: "4ad8992de86847fbcaa31dcc799420b0b09aaef04f8962cc19d86e7be5dd7cd3",
	name: "syncRoom",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => syncRoom.__executeServer(opts));
var syncRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(syncRoom_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).syncRoom(data);
});
var lobby_createServerFn_handler = createServerRpc({
	id: "2849c3d94e9ceccd5a4e857260cc6fdb7a7cc9bb80172b1e554c8481ed031da3",
	name: "lobby",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => lobby.__executeServer(opts));
var lobby = createServerFn({ method: "POST" }).validator((input) => input).handler(lobby_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).lobby(data);
});
var sendPlan_createServerFn_handler = createServerRpc({
	id: "21df4352da05875421f65e6aff2a74408303b55874309f90e7b7524e224c8416",
	name: "sendPlan",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => sendPlan.__executeServer(opts));
var sendPlan = createServerFn({ method: "POST" }).validator((input) => input).handler(sendPlan_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).sendPlan(data);
});
var sendTurn_createServerFn_handler = createServerRpc({
	id: "8636ea2d5ef34fdb1aa0b22b904e890f57cf069e8dd7f9383409ab324fcd6b85",
	name: "sendTurn",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => sendTurn.__executeServer(opts));
var sendTurn = createServerFn({ method: "POST" }).validator((input) => input).handler(sendTurn_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).sendTurn(data);
});
var sendDuel_createServerFn_handler = createServerRpc({
	id: "18c147dd390fb87a8ee23fd1fe2b38df983be57af9e1e35b8dc88ddb6d29f921",
	name: "sendDuel",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => sendDuel.__executeServer(opts));
var sendDuel = createServerFn({ method: "POST" }).validator((input) => input).handler(sendDuel_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).sendDuel(data);
});
var sendStart_createServerFn_handler = createServerRpc({
	id: "e27c654d097576d32d10740d11902a6a19b0cbb91e4d9b4dc79323e2e12e1d21",
	name: "sendStart",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => sendStart.__executeServer(opts));
var sendStart = createServerFn({ method: "POST" }).validator((input) => input).handler(sendStart_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).sendStart(data);
});
var sendPause_createServerFn_handler = createServerRpc({
	id: "da0ad5eb962e5d9ca63f62e977a7bff5cd825119ae7edc54b288afadd93c3f06",
	name: "sendPause",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => sendPause.__executeServer(opts));
var sendPause = createServerFn({ method: "POST" }).validator((input) => input).handler(sendPause_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).sendPause(data);
});
var sendChat_createServerFn_handler = createServerRpc({
	id: "1d30cd0b4c79bd0ccf22aa042ad79fc5a321bc8d2ff349fe594e26a8ed3741f1",
	name: "sendChat",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => sendChat.__executeServer(opts));
var sendChat = createServerFn({ method: "POST" }).validator((input) => input).handler(sendChat_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).sendChat(data);
});
var sendLeave_createServerFn_handler = createServerRpc({
	id: "812d2be197def26dba40d88620188d15339566ea2f75c71a66348a3c3e091478",
	name: "sendLeave",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => sendLeave.__executeServer(opts));
var sendLeave = createServerFn({ method: "POST" }).validator((input) => input).handler(sendLeave_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).sendLeave(data);
});
var judgeCommand_createServerFn_handler = createServerRpc({
	id: "fcaaf35b74909dd494aa7a5faa689a3a1872a702f3d9393bd79164413b3909cb",
	name: "judgeCommand",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => judgeCommand.__executeServer(opts));
var judgeCommand = createServerFn({ method: "POST" }).validator((input) => input).handler(judgeCommand_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).judgeCommand(data);
});
var listRooms_createServerFn_handler = createServerRpc({
	id: "bfec3557cc00b59fb3d9423ac0fe59f096c6c8fe94877bccda19e9ca782ea3c5",
	name: "listRooms",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => listRooms.__executeServer(opts));
var listRooms = createServerFn({ method: "GET" }).handler(listRooms_createServerFn_handler, async () => {
	return (await import("./api.server-L6vrE9QF.mjs")).listRooms();
});
var deleteRoom_createServerFn_handler = createServerRpc({
	id: "e7695425e54a014f651483c3dd64d271259d8639df655c2820eb6e2be0f09d0e",
	name: "deleteRoom",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => deleteRoom.__executeServer(opts));
var deleteRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(deleteRoom_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).deleteRoom(data);
});
var fetchLogs_createServerFn_handler = createServerRpc({
	id: "c1b474d8e164c15dbe5b5824bc96123d01213938d65f1c00307a278b16f8555e",
	name: "fetchLogs",
	filename: "src/lib/quidditch/api.ts"
}, (opts) => fetchLogs.__executeServer(opts));
var fetchLogs = createServerFn({ method: "POST" }).validator((input) => input).handler(fetchLogs_createServerFn_handler, async ({ data }) => {
	return (await import("./api.server-L6vrE9QF.mjs")).fetchLogs(data);
});
//#endregion
export { createRoom_createServerFn_handler, deleteRoom_createServerFn_handler, fetchLogs_createServerFn_handler, joinRoom_createServerFn_handler, judgeCommand_createServerFn_handler, listRooms_createServerFn_handler, lobby_createServerFn_handler, sendChat_createServerFn_handler, sendDuel_createServerFn_handler, sendLeave_createServerFn_handler, sendPause_createServerFn_handler, sendPlan_createServerFn_handler, sendStart_createServerFn_handler, sendTurn_createServerFn_handler, syncRoom_createServerFn_handler };
