//#region node_modules/.nitro/vite/services/ssr/assets/types-B0hlOrFm.js
var TEAMS = [
	{
		key: "gryffindor",
		label: "Гриффиндор",
		rgb: "211,58,58"
	},
	{
		key: "hufflepuff",
		label: "Пуффендуй",
		rgb: "241,196,15"
	},
	{
		key: "ravenclaw",
		label: "Когтевран",
		rgb: "52,156,255"
	},
	{
		key: "slytherin",
		label: "Слизерин",
		rgb: "46,204,113"
	}
];
var ROLES = [
	{
		key: "keeper",
		label: "Вратарь",
		letter: "В"
	},
	{
		key: "seeker",
		label: "Ловец",
		letter: "Л"
	},
	{
		key: "chaser1",
		label: "Охотник 1",
		letter: "О1"
	},
	{
		key: "chaser2",
		label: "Охотник 2",
		letter: "О2"
	},
	{
		key: "beater",
		label: "Загонщик",
		letter: "З"
	}
];
var BOT_DIFFICULTIES = [
	{
		level: 1,
		key: "easy",
		label: "Лёгкий",
		actionRate: .55,
		mistakeRate: .38,
		chaseHiddenSnitchRate: .05
	},
	{
		level: 2,
		key: "medium",
		label: "Средний",
		actionRate: .8,
		mistakeRate: .18,
		chaseHiddenSnitchRate: .4
	},
	{
		level: 3,
		key: "hard",
		label: "Сложный",
		actionRate: .95,
		mistakeRate: .06,
		chaseHiddenSnitchRate: .95
	}
];
function emptyStats() {
	return {
		quafflePickups: 0,
		quaffleSteals: 0,
		quafflePasses: 0,
		goalsScored: 0,
		goalsSaved: 0,
		snitchCatches: 0,
		bludgerHits: 0,
		bludgerHitsToPlayers: 0
	};
}
function teamLabel(key) {
	return TEAMS.find((t) => t.key === key)?.label ?? key;
}
function teamRgb(key) {
	return TEAMS.find((t) => t.key === key)?.rgb ?? "180,180,180";
}
function roleLabel(role) {
	return ROLES.find((r) => r.key === role)?.label ?? "Наблюдатель";
}
function roleLetter(role) {
	return ROLES.find((r) => r.key === role)?.letter ?? "•";
}
function isTeamKey(v) {
	return TEAMS.some((t) => t.key === v);
}
function isRoleKey(v) {
	return ROLES.some((r) => r.key === v);
}
//#endregion
export { isRoleKey as a, roleLetter as c, emptyStats as i, teamLabel as l, ROLES as n, isTeamKey as o, TEAMS as r, roleLabel as s, BOT_DIFFICULTIES as t, teamRgb as u };
