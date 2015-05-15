/**
 * @fileoverview
 * List nodes in a table-like view.
 */

angular.module('bridge.ui')
.directive('coNodeList', function(k8s, _, pkg, arraySvc, resourceMgrSvc) {
  'use strict';

  return {
    templateUrl: '/static/module/ui/resources/node-list.html',
    restrict: 'E',
    replace: true,
    scope: {
      search: '=',
    },
    controller: function($scope) {
      $scope.loadError = false;

      function loadNodes() {
        k8s.nodes.list()
          .then(function(nodes) {
            $scope.nodes = nodes;
            $scope.loadError = false;
          })
          .catch(function() {
            $scope.nodes = null;
            $scope.loadError = true;
          });
      }

      loadNodes();

      $scope.getStatus = function(node) {
        if (!pkg.propExists('status.conditions', node) || _.isEmpty(node.status.conditions)) {
          return 'Unknown';
        }

        return pkg.join(node.status.conditions, ', ', function(v) {
          return v.type + ': ' + v.status;
        });
      };

      $scope.$on(k8s.events.NODE_DELETED, function(e, data) {
        resourceMgrSvc.removeFromList($scope.nodes, data.resource);
      });

      $scope.$on(k8s.events.NODE_ADDED, function(e, data) {
        resourceMgrSvc.updateInList($scope.nodes, data.resource);
      });

      $scope.$on(k8s.events.NODE_MODIFIED, function(e, data) {
        resourceMgrSvc.updateInList($scope.nodes, data.resource);
      });

    }
  };

});