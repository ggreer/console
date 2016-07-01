angular.module('bridge.page')
  .controller('NamespaceQuayPullSecretCtrl', function NamespaceQuayPullSecretCtrl(
    $q,
    $scope,
    $uibModalInstance,
    $window,
    CONST,
    k8s,
    namespace
  ) {
    'use strict';

    // ---

    $scope.namespace  = namespace;
    $scope.pullSecret = null;
    $scope.model      = null;
    $scope.submit     = submit;

    // ---

    (function activate() {
      $scope.pullSecretLoaded = k8s.secrets.get(CONST.QUAY_IO_SECRET_NAME, namespace.metadata.name)
        .catch(function (error) {
          // quay.io pull secret doesn't exist, we're in create mode
          if (error.status === 404) {
            return;
          }

          throw error;
        })
        .then(function (pullSecret) {
          $scope.pullSecret = pullSecret;
          $scope.model      = {
            isNew: !pullSecret,
            value: pullSecret && $window.atob(pullSecret.data[CONST.PULL_SECRET_DATA])
          };
        })
      ;
    })();

    // ---

    function submit() {
      $scope.pullSecretUpdated = ($scope.model.value ? ($scope.model.isNew ? submitCreate : submitUpdate) : submitDelete)()
        .then($uibModalInstance.close.bind($uibModalInstance))
      ;
    }

    // ---

    function submitCreate() {
      const data = {};
      data[CONST.PULL_SECRET_DATA] = $window.btoa($scope.model.value);

      return k8s.secrets.create({
        metadata: {
          name:      CONST.QUAY_IO_SECRET_NAME,
          namespace: namespace.metadata.name
        },
        data: data,
        type: CONST.PULL_SECRET_TYPE
      });
    }

    function submitUpdate() {
      return k8s.resource.patch(k8s.kinds.SECRET, $scope.pullSecret, [{
        op:    'replace',
        path:  '/data/' + CONST.PULL_SECRET_DATA,
        value: $window.btoa($scope.model.value)
      }]);
    }

    function submitDelete() {
      if ($scope.model.isNew) {
        return $q.when();
      }

      return k8s.secrets.delete($scope.pullSecret);
    }
  })
;