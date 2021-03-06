import * as _ from 'lodash-es';
import * as React from 'react';
import * as classNames from 'classnames';

import { k8sGet } from '../module/k8s';
import { ConfigMapModel, AppVersionModel } from '../models';
import { k8sVersion } from '../module/status';
import { coFetchJSON } from '../co-fetch';
import { SafetyFirst } from './safety-first';
import { LoadingInline, cloudProviderNames } from './utils';
import { clusterAppVersionName } from './channel-operators/tectonic-channel';


const StatusIconRow = ({state, text}) => {
  const iconClasses = {
    ok: 'fa-check',
    warning: 'fa-warning',
    critical: 'fa-warning',
    unknown: 'fa-question-circle',
    'access-denied': 'fa-ban'
  };
  return <div className={classNames('co-m-status', [`co-m-status--${state}`])}>
    <i className={classNames('co-m-status__icon', 'fa', iconClasses[state])}></i>
    <span className="co-m-status__text">{text}</span>
  </div>;
};

export const StatusIcon = ({state, text}) => {
  if (['ok', 'warning', 'critical', 'unknown', 'access-denied'].includes(state)) {
    return <StatusIconRow state={state} text={text} />;
  }

  return <div className="co-m-status">
    <span className="co-m-status__text">{text}</span>
  </div>;
};

export const SubHeaderRow = ({header, children}) => {
  return <div className="row">
    <div className="col-xs-12">
      <h4 className="cluster-overview-cell__title">
        {header}
      </h4>
      {children}
    </div>
  </div>;
};

const SoftwareDetailRow = ({title, detail, text, children}) => {
  return <div className="row cluster-overview-cell__info-row">
    <div className="col-xs-6">
      {title}
    </div>
    <div className="col-xs-6 text-right">
      <div>
        {!detail && <LoadingInline />}
        {detail === 'unknown' ? <StatusIcon state={detail} text={text} /> : detail}
      </div>
      {children}
    </div>
  </div>;
};


export class SoftwareDetails extends SafetyFirst {
  constructor(props) {
    super(props);
    this.state = {
      tectonicVersion: null,
      kubernetesVersion: null,
      cloudProviders: null,
      tectonicVersionObj: null,
      currentTectonicVersion: null,
    };
  }

  componentDidMount() {
    super.componentDidMount();
    this._checkTectonicVersion();
    this._checkKubernetesVersion();
    this._checkCloudProvider();
    this._checkAppVersions();
  }

  _checkTectonicVersion() {
    coFetchJSON('api/tectonic/version')
      .then((data) => {
        this.setState({ tectonicVersion: data.version, tectonicVersionObj: data });
      })
      .catch(() => this.setState({ tectonicVersion: 'unknown' }));
  }

  _checkAppVersions() {
    k8sGet(AppVersionModel).then((appversions) => {
      const tectonicTPR = _.find(appversions.items, (a) => a.metadata.name === clusterAppVersionName);
      if (tectonicTPR) {
        this.setState({ currentTectonicVersion: tectonicTPR.status.currentVersion });
      }
    }).catch(() => this.setState({ currentTectonicVersion: null }));
  }

  _checkKubernetesVersion() {
    k8sVersion()
      .then((data) => this.setState({ kubernetesVersion: data.gitVersion }))
      .catch(() => this.setState({ kubernetesVersion: 'unknown' }));
  }

  _checkCloudProvider() {
    k8sGet(ConfigMapModel, 'tectonic-config', 'tectonic-system').then((configMap) => {
      this.setState({ cloudProviders: [_.get(configMap, 'data.installerPlatform', null)]});
    }, () => this.setState({ cloudProviders: ['UNKNOWN']}));
  }

  render () {
    const {kubernetesVersion, currentTectonicVersion, tectonicVersion, cloudProviders } = this.state;

    return <div>
      <SoftwareDetailRow title="Kubernetes"
        detail={kubernetesVersion} text="Kubernetes version could not be determined." />

      <SoftwareDetailRow title="Tectonic" detail={currentTectonicVersion || tectonicVersion}
        text="Tectonic version could not be determined." />


      {cloudProviders &&
        <SoftwareDetailRow title="Cloud Provider" detail={cloudProviderNames(cloudProviders)}
          text="Cloud Provider could not be determined." />
      }
    </div>;
  }
}
