(function() {

var validator = function($compile, $timeout, $parse, validators, $rootScope) {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function($scope, $element, $attributes, $controller) {

			var html;
			var currentTimeout = null;
			var currentErrorNames = [];
			var ngModelName = $attributes.name;
			var serverErrorsKey = $attributes.validatorErrorKey;
			var onKeyPressDefault = {event: 'input', delay: 300};
			var errorSpan = angular.element('<span class="validator-invalid text-danger" translate></span>');
			var event = $attributes.validatorOnEvent || $rootScope.validation.onEvent || onKeyPressDefault.event;
			var validatorDelay = parseInt($attributes.validatorDelay) || $rootScope.validation.delay || (event === onKeyPressDefault.event) ? onKeyPressDefault.delay:false;
			var timeout = validatorDelay || 0;
			var validatorNames = $attributes.validator.replace(' ', '').split(',');
			var isContext = (_.find(validatorNames, function(name){return name.startsWith('_')})!=undefined);

			angular.element($element[0].parentNode).append(errorSpan);

			var validateTemp = function(){
				$scope.$evalAsync(function(){
					var activeErrors = {};

					_.forEach(validatorNames, function(name){
						var validator = validators[name];
						if(name && !validator){
							throw new Error('Validator name: "'+name+'" is incorrect!')
						}
						var result = true;
						try {
							validator.call($scope, $element.val());
						} catch (e){
							result = false;
						}
						if(!result){
							activeErrors[name]=true;
						}
					});

					if($scope.serverErrors){
						_.forEach($scope.serverErrors[serverErrorsKey], function(value, key){
							$scope.serverErrors = false;
							activeErrors[key]=true;
						});
					}

					var newErrors = _.sortBy(Object.keys(activeErrors));

					if(!_.isEqual(newErrors, currentErrorNames)){
						currentErrorNames = newErrors;
						if(currentErrorNames.length){
							html = '<ul class="error-message">';
							_.forEach(activeErrors, function(name, key){
								html+='<li translate>error-'+ key +'</li>'
							});
							html+= '</ul>'
						} else {
							html = '';
						}
						$controller.$setValidity(ngModelName, !Object.keys(activeErrors).length);
						$controller.$render();
						errorSpan.html(html);
					}

				})
			};

			var validate = function(){
				if(event === onKeyPressDefault.event){
					if(currentTimeout){
						$timeout.cancel(currentTimeout);
					}
					currentTimeout = $timeout(function(){
						validateTemp();
						currentTimeout = null;
					}, timeout);
				} else {
					validateTemp();
				}
			};

			$scope.$on('serverErrors', function(){
				if($scope.serverErrors && $scope.serverErrors[serverErrorsKey]){
					validate();
				}
			});

			$scope.$on('refreshErrorMessages', validate);

			if(isContext){
				$scope.$on('refreshContextErrorMessages', validate);
				$element.bind(event, function(){
					$scope.$broadcast('refreshContextErrorMessages', true);
				});
			}else{
				$element.bind(event, validate);
			}
		}
	}
};
var auxValidation = function($timeout, $parse){
	return {
		restrict: 'A',
		priority: 1,
		link: function($scope, $element, $attributes) {
			$parse($attributes.stop)($scope);
			$element.off('click');
			$element.on('click', function($event) {
				$event.preventDefault();
				$scope.$broadcast('refreshErrorMessages', true);
				$timeout(function(){
					if($scope.Form.$valid){
						$parse($attributes.ngClick)($scope)
					}
				})
			});
		}
	}
};
var serverErrors = function(){
	return {
		restrict: 'A',
		link: function($scope, $element, $attributes){
			$scope.$watch(function(){
				return $scope[$attributes.serverErrors];
			}, function(){
				$scope.serverErrors = $scope[$attributes.serverErrors];
				$scope.$broadcast('serverErrors', true);
			});
		}
	}
};

angular.module('aux-validation', []).directive('validator', validator);
angular.module('aux-validation', []).directive('stop', auxValidation);
angular.module('aux-validation', []).directive('serverErrors', serverErrors);

})();