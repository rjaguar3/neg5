(() => {
    
    angular.module('tournamentApp')
        .filter('preventSameMatchTeams', () => {
            return (items, otherTeamId) => {
                return items.filter(item => item.id !== otherTeamId)
            }
        });

    angular.module('tournamentApp')
        .controller('GameCtrl', ['$scope', 'Team', 'Game', 'Phase', 'Tournament', GameCtrl]);
    
    function GameCtrl($scope, Team, Game, Phase, Tournament) {
        
        let vm = this;

        vm.teams = Team.teams;
        vm.games = Game.games;
        vm.phases = Phase.phases;
        
        vm.sortType = 'round';
        vm.sortReverse = false;
        vm.gameQuery = '';

        vm.pointScheme = Tournament.pointScheme;
        vm.rules = Tournament.rules;
        
        vm.pointSum = function(points) {
            if (!points) {return 0;}
            let values = Object.keys(points);
            return values.reduce((sum, current) => {
                let product = (points[current + ''] * current) || 0;
                return sum + product;
            }, 0)
        }

        vm.teamBonusPoints = (team) => {
            if (!team) return 0;
            let tossupSum = team.players.map(player => vm.pointSum(player.points)).reduce((sum, current) => sum + current, 0);
            return (team.score || 0) - tossupSum - (team.bouncebacks || 0);
        }

        vm.teamPPB = (team) => {
            if (!team) return 0;

            if (team.players.length === 0) return 0;

            let totalTossupsWithoutOT = totalTeamTossupGets(team) - (team.overtime || 0);
            let totalBonusPoints = vm.teamBonusPoints(team);
            return (totalBonusPoints / totalTossupsWithoutOT) || 0;
        } 

        function totalTeamTossupGets(team) {
            if (!team) return 0;

             let totalTossups = team.players.map(player => {
                let sum = 0;
                for (let pv in player.points) {
                    if (player.points.hasOwnProperty(pv) && pv > 0) {
                        sum += player.points[pv];
                    }
                }
                return sum;
            })
            .reduce((sum, current) => sum + current, 0);
            return totalTossups;
        }
        
        vm.currentGame = {
            teams: [
               {
                  teamInfo: null,
                  players: []
               },
               {
                  teamInfo: null,
                  players: []
               } 
            ],
            phases: [],
            round: 1,
            tuh: 20,
            room: null,
            moderator: null,
            packet: null,
            notes: null
        }

        vm.loadedGame = {};
        vm.loadedGameOriginal = {};

        vm.addTeam = (team) => {
            let toastConfig = {message: 'Loading ' + team.teamInfo.name + ' players.'};
            $scope.toast(toastConfig);
            Game.getTeamPlayers($scope.tournamentId, team.teamInfo.id)
                .then(players => {
                    team.players = players.map(({name, id}) => {
                        return {
                            id,
                            name,
                            points: vm.pointScheme.tossupValues.reduce((obj, current) => {
                                obj[current.value] = 0;
                                return obj;
                            }, {}),
                            tuh: vm.currentGame.tuh
                        }
                    });
                    toastConfig.success = true;
                    toastConfig.message = 'Loaded ' + team.teamInfo.name + ' players (' + team.players.length + ')';
                })
                .catch(error => {
                    toastConfig.success = false;
                    toastConfig.message = 'Could not load team.';
                })
                .finally(() => {
                    toastConfig.hideAfter = true;
                    $scope.toast(toastConfig);
                })
        }
        
        vm.getGames = () => Game.getGames($scope.tournamentId);

        vm.resetForm = resetForm;
        
        vm.addGame = () => {
            if (vm.newGameForm.$valid) {
                let toastConfig = {message: 'Adding match.'};
                $scope.toast(toastConfig);
                Game.postGame($scope.tournamentId, vm.currentGame)
                    .then(() => {
                        vm.resetForm();
                        vm.getGames();
                        toastConfig.success = true;
                        toastConfig.message = 'Added match';
                    })
                    .catch(error => {
                        toastConfig.success = false;
                        toastConfig.message = 'Could not add match';
                    })
                    .finally(() => {
                        toastConfig.hideAfter = true;
                        $scope.toast(toastConfig);
                    })
            }
        };

        vm.loadGame = (gameId) => {
            let toastConfig = {message: 'Loading game.'};
            $scope.toast(toastConfig);
            Game.getGameById($scope.tournamentId, gameId)
                .then(game => {
                    game.phases = setLoadedGamePhases(game, vm.phases);
                    setLoadedGameTeams(game, vm.teams);
                    
                    angular.copy(game, vm.loadedGame);
                    angular.copy(vm.loadedGame, vm.loadedGameOriginal);
                    
                    toastConfig.message = 'Loaded game';
                    toastConfig.success = true;
                })
                .catch(error => {
                    toastConfig.message = 'Could not load game';
                    toastConfig.success = false;
                })
                .finally(() => {
                    toastConfig.hideAfter = true;
                    $scope.toast(toastConfig);
                })
        }
        
        vm.resetLoadedGame = () => angular.copy(vm.loadedGameOriginal, vm.loadedGame);
        
        vm.editLoadedGame = () => {
            if (vm.editGameForm.$valid) {
                let toastConfig = {message: 'Editing match.'};
                $scope.toast(toastConfig);
                Game.editGame($scope.tournamentId, vm.loadedGame.id, vm.loadedGame)
                    .then(() => {
                        vm.loadedGame.editing = false;
                        vm.getGames();
                        
                        toastConfig.message = 'Edited match.';
                        toastConfig.success = true;
                    })
                    .catch(error => {
                        toastConfig.message = 'Could not edit match';
                        toastConfig.success = false;
                    })
                    .finally(() => {
                        toastConfig.hideAfter = true;
                        $scope.toast(toastConfig);
                    })
            }
        }
        
        vm.deleteGame = (gameId) => {
            if (gameId) {
                let toastConfig = {message: 'Deleting match.'};
                $scope.toast(toastConfig);
                Game.deleteGame($scope.tournamentId, gameId)
                    .then(() => {
                        
                        vm.loadedGame = {};
                        
                        toastConfig.message = 'Deleted match.';
                        toastConfig.success = true;
                    })
                    .catch(error => {
                        toastConfig.message = 'Could not delete match.'
                        toastConfig.success = false;
                    })
                    .finally(() => {
                        toastConfig.hideAfter = true;
                        $scope.toast(toastConfig);
                    })
            }
        }

        vm.resetCurrentGame = () => {
            vm.currentGame = {
                teams: [
                {
                    teamInfo: null,
                    players: []
                },
                {
                    teamInfo: null,
                    players: []
                } 
                ],
                phases: [],
                round: 1,
                tuh: 20,
                room: null,
                moderator: null,
                packet: null,
                notes: null
            }
        }
        
        vm.numPlayerAnswers = (player, onlyCorrectAnswers = false) => {
            let sum = 0;
            for (const point in player.points) {
                if (player.points.hasOwnProperty(point) && (point >= 0 || !onlyCorrectAnswers)) {
                    sum += (player.points[point] || 0);
                }
            }
            return sum;
        }
        
        vm.minPossibleTossupsHeard = (match) => {
            const totalCorrectAnswers = match.teams ? match.teams.reduce((sum, currentTeam) => {
                let tossupsGotten = currentTeam.players.reduce((t, curr) => t + vm.numPlayerAnswers(curr, true), 0);
                return sum + tossupsGotten;
            }, 0) : 0
            
            const totalWrongAnswers = match.teams ? match.teams.reduce((sum, currentTeam) => {
                let totalNegs = currentTeam.players.reduce((t, curr) => {
                    let total = 0;
                    for (const point in curr.points) {
                        if (curr.points.hasOwnProperty(point) && point < 0) {
                            total += curr.points[point]
                        }
                    } 
                    return t + total
                }, 0)
                return sum += totalNegs
            }, 0) : 0
            
            if (totalWrongAnswers > totalCorrectAnswers) {
                const extraNegs = totalWrongAnswers - totalCorrectAnswers
                return extraNegs + totalCorrectAnswers
            }
            return totalCorrectAnswers
            
        }
        
        vm.matchSearch = (match) => {
            const normalizedQuery = vm.gameQuery.toLowerCase();
            const {round, teams} = match;
            const teamOneName = teams.one.name.toLowerCase();
            const teamTwoName = teams.two.name.toLowerCase();
            
            return match.round == normalizedQuery
                || teamOneName.indexOf(normalizedQuery) !== -1
                || teamTwoName.indexOf(normalizedQuery) !== -1
        }
        
        function resetForm() {
            vm.resetCurrentGame();
            vm.newGameForm.$setUntouched();
        }
        
        function setLoadedGamePhases(loadedGame, tournamentPhases) {
            let loadedGamePhaseMap = loadedGame.phases.reduce((aggr, current) => {
                aggr[current.id] = true;
                return aggr;
            }, {})
            return tournamentPhases.filter(phase => loadedGamePhaseMap[phase.id] === true);
        }
        
        function setLoadedGameTeams(loadedGame, teams) {
            loadedGame.teams.forEach(matchTeam => {
                let index = teams.findIndex(team => team.id === matchTeam.id);
                if (index !== -1) {
                    matchTeam.teamInfo = teams[index]; 
                }
            });
        }
        
        function buildTeamMap(teams) {
            return teams.reduce((aggr, current) => {
                aggr[current.id] = current;
                return aggr;
            }, {});
        }

        vm.getGames();
        
    }
    
})();