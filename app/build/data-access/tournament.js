'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _db = require('../database/db');

var _sql = require('../database/sql');

var _sql2 = _interopRequireDefault(_sql);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var tournament = _sql2.default.tournament;
var collaborator = _sql2.default.collaborator;
var division = _sql2.default.division;
var phase = _sql2.default.phase;
var account = _sql2.default.account;
exports.default = {

    saveTournament: function saveTournament(tournamentInfo) {

        return new Promise(function (resolve, reject) {
            var id = tournamentInfo.id;
            var name = tournamentInfo.name;
            var date = tournamentInfo.date;
            var questionSet = tournamentInfo.questionSet;
            var comments = tournamentInfo.comments;
            var location = tournamentInfo.location;
            var tossupScheme = tournamentInfo.tossupScheme;
            var username = tournamentInfo.username;


            var tournamentParams = [id, name, date, questionSet, comments, location, username];

            var _buildTournamentPoint = buildTournamentPointSchemeInsertQuery(tossupScheme, id);

            var tournamentIds = _buildTournamentPoint.tournamentIds;
            var values = _buildTournamentPoint.values;
            var types = _buildTournamentPoint.types;


            var queriesArray = [];
            queriesArray.push({
                text: tournament.add,
                params: tournamentParams,
                queryType: _db.txMap.one
            }, {
                text: tournament.addTossupScheme,
                params: [id, tournamentIds, values, types],
                queryType: _db.txMap.any
            });
            (0, _db.transaction)(queriesArray).then(function (result) {
                var formatted = {
                    tournament: result[0],
                    pointScheme: result[1]
                };
                resolve(formatted);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    findTournamentsByUser: function findTournamentsByUser(username) {

        return new Promise(function (resolve, reject) {

            var params = [username];

            (0, _db.query)(tournament.findByUser, params, _db.queryTypeMap.any).then(function (tournaments) {
                return resolve(tournaments);
            }).catch(function (error) {
                reject(error);
            });
        });
    },

    findTournamentById: function findTournamentById(id) {
        var currentUser = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
        var getPermissions = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];


        return new Promise(function (resolve, reject) {
            var params = [id];

            var queriesArray = [{
                text: tournament.findById,
                params: [id],
                queryType: _db.txMap.one
            }];
            if (getPermissions) {
                queriesArray.push({
                    text: account.permissions,
                    params: [id, currentUser],
                    queryType: _db.txMap.one
                });
            }

            (0, _db.transaction)(queriesArray).then(function (result) {
                resolve({
                    tournament: result[0],
                    permissions: result[1]
                });
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    updateTournament: function updateTournament(id, newInfo) {
        return new Promise(function (resolve, reject) {
            var name = newInfo.name;
            var _newInfo$location = newInfo.location;
            var location = _newInfo$location === undefined ? null : _newInfo$location;
            var _newInfo$date = newInfo.date;
            var date = _newInfo$date === undefined ? null : _newInfo$date;
            var _newInfo$questionSet = newInfo.questionSet;
            var questionSet = _newInfo$questionSet === undefined ? null : _newInfo$questionSet;
            var _newInfo$comments = newInfo.comments;
            var comments = _newInfo$comments === undefined ? null : _newInfo$comments;
            var _newInfo$hidden = newInfo.hidden;
            var hidden = _newInfo$hidden === undefined ? false : _newInfo$hidden;

            var params = [id, name, location, date, questionSet, comments, hidden];

            (0, _db.query)(tournament.update, params, _db.queryTypeMap.one).then(function (updatedInfo) {
                return resolve(updatedInfo);
            }).catch(function (error) {
                reject(error);
            });
        });
    },

    updateRules: function updateRules(id, _ref) {
        var bouncebacks = _ref.bouncebacks;
        var maxActive = _ref.maxActive;

        return new Promise(function (resolve, reject) {
            var params = [id, maxActive, bouncebacks];
            (0, _db.query)(tournament.updateRules, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    addTossupPointValue: function addTossupPointValue(id, _ref2) {
        var type = _ref2.type;
        var value = _ref2.value;

        return new Promise(function (resolve, reject) {
            var params = [id, type, value];

            (0, _db.query)(tournament.editPointScheme.add, params, _db.queryTypeMap.one).then(function (newTossupValue) {
                return resolve(newTossupValue);
            }).catch(function (error) {
                reject(error);
            });
        });
    },

    updateTossupPointValues: function updateTossupPointValues(id, tossupPointValues, bonusPointValue, partsPerBonus) {
        return new Promise(function (resolve, reject) {
            var editQueries = tournament.editPointScheme.edit;

            var queriesArray = [];

            queriesArray.push({
                text: editQueries.deleteTossupValues,
                params: [id],
                queryType: _db.txMap.none
            });
            queriesArray.push({
                text: editQueries.updateBonusValues,
                params: [id, bonusPointValue, partsPerBonus],
                queryType: _db.txMap.one
            });

            var _buildTournamentPoint2 = buildTournamentPointSchemeInsertQuery(tossupPointValues, id);

            var tournamentIds = _buildTournamentPoint2.tournamentIds;
            var values = _buildTournamentPoint2.values;
            var types = _buildTournamentPoint2.types;

            queriesArray.push({
                text: editQueries.updateTossupPointValues,
                params: [id, tournamentIds, values, types],
                queryType: _db.txMap.any
            });

            (0, _db.transaction)(queriesArray).then(function (result) {
                var data = {
                    partsPerBonus: result[1].parts_per_bonus,
                    bonusPointValue: result[1].bonus_point_value,
                    tossupValues: result[2]
                };
                resolve(data);
            }).catch(function (error) {
                reject(error);
            });
        });
    },

    addCollaborator: function addCollaborator(id, username, isAdmin) {
        return new Promise(function (resolve, reject) {
            var params = [id, username, isAdmin];
            (0, _db.query)(collaborator.add, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    findTournamentCollaborators: function findTournamentCollaborators(id) {
        return new Promise(function (resolve, reject) {
            var params = [id];
            (0, _db.query)(collaborator.findByTournament, params, _db.queryTypeMap.any).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    updateCollaborator: function updateCollaborator(id, username, isAdmin) {
        return new Promise(function (resolve, reject) {
            var params = [id, username, isAdmin];
            (0, _db.query)(collaborator.edit, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    deleteCollaborator: function deleteCollaborator(id, username) {
        return new Promise(function (resolve, reject) {
            var params = [id, username];
            (0, _db.query)(collaborator.remove, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    getTournamentDivisions: function getTournamentDivisions(id) {
        return new Promise(function (resolve, reject) {
            var params = [id];
            (0, _db.query)(division.findByTournament, params, _db.queryTypeMap.any).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                console.log(error);
                reject(error);
            });
        });
    },

    editTournamentDivision: function editTournamentDivision(tournamentId, divisionId, newDivisionName) {
        return new Promise(function (resolve, reject) {
            var params = [tournamentId, divisionId, newDivisionName];
            (0, _db.query)(division.edit, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    addTournamentDivision: function addTournamentDivision(tournamentId, divisionName, divisionId, phaseId) {
        return new Promise(function (resolve, reject) {
            var params = [tournamentId, divisionId, divisionName, phaseId];
            (0, _db.query)(division.add, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    removeDivisionFromTournament: function removeDivisionFromTournament(tournamentId, divisionId) {
        return new Promise(function (resolve, reject) {
            var params = [tournamentId, divisionId];
            (0, _db.query)(division.remove, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    getTournamentPhases: function getTournamentPhases(id) {
        return new Promise(function (resolve, reject) {
            var params = [id];
            (0, _db.query)(phase.findByTournament, params, _db.queryTypeMap.any).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    updateTournamentPhase: function updateTournamentPhase(id, phaseId, newName) {
        return new Promise(function (resolve, reject) {
            var params = [id, phaseId, newName];
            (0, _db.query)(phase.update, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    addTournamentPhase: function addTournamentPhase(id, phaseId, name) {
        return new Promise(function (resolve, reject) {
            var params = [id, phaseId, name];
            (0, _db.query)(phase.add, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    deleteTournamentPhase: function deleteTournamentPhase(id, phaseId) {
        return new Promise(function (resolve, reject) {
            var params = [id, phaseId];
            (0, _db.query)(phase.remove, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    setTournamentActivePhase: function setTournamentActivePhase(tournamentId, phaseId) {
        return new Promise(function (resolve, reject) {
            var params = [tournamentId, phaseId];
            (0, _db.query)(phase.setActive, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    }

};


function buildTournamentPointSchemeInsertQuery(rows, tournamentId) {

    var tournamentIds = rows.map(function (row) {
        return tournamentId;
    });
    var values = rows.map(function (row) {
        return row.value;
    });
    var types = rows.map(function (row) {
        return row.type;
    });

    return {
        tournamentIds: tournamentIds,
        values: values,
        types: types
    };
}