'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _db = require('../database/db');

var _matchBuilder = require('./../helpers/array_builders/match.builder.js');

var _sql = require('../database/sql');

var _sql2 = _interopRequireDefault(_sql);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var match = _sql2.default.match;

exports.default = {

    getMatchesByTournament: function getMatchesByTournament(tournamentId) {
        return new Promise(function (resolve, reject) {
            var params = [tournamentId];

            (0, _db.query)(match.findByTournament, params, _db.queryTypeMap.any).then(function (matches) {
                matches.forEach(function (match) {
                    match.phases = match.phases.filter(function (phase) {
                        return phase.phase_id !== null;
                    });
                });
                resolve(matches);
            }).catch(function (error) {
                console.log(error);
                reject(error);
            });
        });
    },

    /**
     * Returns either the details for a single match or all matches depending on if detailedAll is true
     */
    findById: function findById(tournamentId, matchId) {
        var detailedAll = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

        return new Promise(function (resolve, reject) {
            matchId = detailedAll ? null : matchId;
            var params = [tournamentId, matchId];
            var returnType = detailedAll ? _db.queryTypeMap.any : _db.queryTypeMap.one;
            (0, _db.query)(match.findById, params, returnType).then(function (match) {
                resolve(match);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    addToTournament: function addToTournament(tournamentId, matchInformation, user) {
        var replacing = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

        return new Promise(function (resolve, reject) {
            var matchId = matchInformation.id;
            var moderator = matchInformation.moderator;
            var notes = matchInformation.notes;
            var packet = matchInformation.packet;
            var phases = matchInformation.phases;
            var room = matchInformation.room;
            var round = matchInformation.round;
            var teams = matchInformation.teams;
            var tuh = matchInformation.tuh;
            var scoresheet = matchInformation.scoresheet;

            var queriesArray = [];
            var matchPhases = (0, _matchBuilder.buildMatchPhasesObject)(tournamentId, matchId, phases);
            var matchTeams = (0, _matchBuilder.buildMatchTeams)(tournamentId, matchId, teams);
            var matchPlayers = (0, _matchBuilder.buildMatchPlayers)(tournamentId, matchId, teams);
            var matchPlayerPoints = (0, _matchBuilder.buildPlayerMatchPoints)(tournamentId, matchId, matchPlayers.players);

            if (replacing) {
                queriesArray.push({
                    text: match.remove,
                    params: [tournamentId, matchId],
                    queryType: _db.txMap.one
                });
            }

            queriesArray.push({
                text: match.add.addMatch,
                params: [matchId, tournamentId, round, room, moderator, packet, tuh, notes, scoresheet, user],
                queryType: _db.txMap.one
            }, {
                text: match.add.addMatchPhases,
                params: [matchPhases.phaseMatchId, matchPhases.phaseTournamentId, matchPhases.phaseId],
                queryType: _db.txMap.any
            }, {
                text: match.add.addMatchTeams,
                params: [matchTeams.teamIds, matchTeams.matchId, matchTeams.tournamentId, matchTeams.score, matchTeams.bouncebacks, matchTeams.overtime],
                queryType: _db.txMap.many
            }, {
                text: match.add.addMatchPlayers,
                params: [matchPlayers.playerIds, matchPlayers.matchIds, matchPlayers.tournamentIds, matchPlayers.tossups],
                queryType: _db.txMap.any
            }, {
                text: match.add.addPlayerTossups,
                params: [matchPlayerPoints.playerIds, matchPlayerPoints.matchIds, matchPlayerPoints.tournamentIds, matchPlayerPoints.values, matchPlayerPoints.numbers],
                queryType: _db.txMap.any
            });

            (0, _db.transaction)(queriesArray).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    },

    deleteTournamentMatch: function deleteTournamentMatch(tournamentId, matchId) {
        return new Promise(function (resolve, reject) {
            var params = [tournamentId, matchId];

            (0, _db.query)(match.remove, params, _db.queryTypeMap.one).then(function (result) {
                return resolve(result);
            }).catch(function (error) {
                return reject(error);
            });
        });
    }

};