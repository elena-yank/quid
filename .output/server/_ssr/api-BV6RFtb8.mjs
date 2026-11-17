import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-BV6RFtb8.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var createRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("c08aa023accc46a0d1fbd9811a34d5434bef19a03ca91ab334d8eeb529377d28"));
var joinRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("3797ff05af26898371182cf4b832d4c220dfd4b6f9fd89161ca9dea0be946bfd"));
var syncRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("4ad8992de86847fbcaa31dcc799420b0b09aaef04f8962cc19d86e7be5dd7cd3"));
var lobby = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("2849c3d94e9ceccd5a4e857260cc6fdb7a7cc9bb80172b1e554c8481ed031da3"));
var sendPlan = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("21df4352da05875421f65e6aff2a74408303b55874309f90e7b7524e224c8416"));
var sendTurn = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("8636ea2d5ef34fdb1aa0b22b904e890f57cf069e8dd7f9383409ab324fcd6b85"));
var sendDuel = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("18c147dd390fb87a8ee23fd1fe2b38df983be57af9e1e35b8dc88ddb6d29f921"));
var sendStart = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("e27c654d097576d32d10740d11902a6a19b0cbb91e4d9b4dc79323e2e12e1d21"));
var sendPause = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("da0ad5eb962e5d9ca63f62e977a7bff5cd825119ae7edc54b288afadd93c3f06"));
var sendChat = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("1d30cd0b4c79bd0ccf22aa042ad79fc5a321bc8d2ff349fe594e26a8ed3741f1"));
var sendLeave = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("812d2be197def26dba40d88620188d15339566ea2f75c71a66348a3c3e091478"));
var judgeCommand = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("fcaaf35b74909dd494aa7a5faa689a3a1872a702f3d9393bd79164413b3909cb"));
var listRooms = createServerFn({ method: "GET" }).handler(createSsrRpc("bfec3557cc00b59fb3d9423ac0fe59f096c6c8fe94877bccda19e9ca782ea3c5"));
var deleteRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("e7695425e54a014f651483c3dd64d271259d8639df655c2820eb6e2be0f09d0e"));
createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("c1b474d8e164c15dbe5b5824bc96123d01213938d65f1c00307a278b16f8555e"));
//#endregion
export { listRooms as a, sendDuel as c, sendPlan as d, sendStart as f, judgeCommand as i, sendLeave as l, syncRoom as m, deleteRoom as n, lobby as o, sendTurn as p, joinRoom as r, sendChat as s, createRoom as t, sendPause as u };
