var app = angular.module('myApp', []);

// Taken from http://stackoverflow.com/questions/14389049/how-to-use-angularjs-with-socket-io
app.factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});

function StateCtrl($scope, socket) {
	$scope.displayLimit = 10;
	$scope.isExpanded = false;
	$scope.totalMessages = 0;
	$scope.states = [];
	$scope.getStates = function() {
		var _states = [];
		for(var key in $scope.states) {
			_states.push($scope.states[key]);
		}
		return _states;
	}

	$scope.calcHappiness = function(state) {
		var avgHappiness = state.totalHappiness / state.numMessages;
		if(isNaN(avgHappiness)) return 0;
		return avgHappiness.toFixed(3);
	};

	$scope.averageHappiness = function() {
		var happiness = 0;
		var numMessages = 0;
		$scope.states.forEach(function(state) {
			happiness += state.totalHappiness;
			numMessages += state.numMessages;
		});
		var avgHappiness = happiness / numMessages;
		if(isNaN(avgHappiness)) return 0;
		return avgHappiness.toFixed(3);
	}

	$scope.expand = function() {
		$scope.displayLimit = $scope.states.length;
		$scope.isExpanded = true;
	}

	$scope.minimize = function() {
		$scope.displayLimit = 10;
		$scope.isExpanded = false;
	}

	socket.on('getStates', function(_states) {
		var states = [];
		for(var key in _states) {
			states.push(_states[key]);
			$scope.totalMessages += _states[key]['numMessages']
		}
		$scope.states = states;
	});

	socket.on('update', function(state) {
		var abbr = Object.keys(state)[0];
		state = state[abbr];
		for(var i = 0; i < $scope.states.length; i++) {
			existing_state = $scope.states[i];
			if(existing_state['name'] === state['name']) {
				$scope.states[i] = state;
				$scope.totalMessages++;
				break;
			}
		}

	});

	$scope.$on('$destory', function (event) {
		socket.removeAllListeners();
	});
}
