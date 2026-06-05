export interface ObsRenderUrls {
  recommendedRenderUrl: string;
  localhostRenderUrl: string;
  debugRenderUrl: string;
  controlUrl: string;
}

export interface ObsRenderUrlOptions {
  location: Pick<Location, 'protocol' | 'hostname' | 'port'>;
  transparent: boolean;
}

export function createObsRenderUrls(options: ObsRenderUrlOptions): ObsRenderUrls {
  const protocol = options.location.protocol || 'http:';
  const port = options.location.port ? `:${options.location.port}` : '';
  const transparentPart = options.transparent ? '&transparent=1' : '';
  const recommendedOrigin = `${protocol}//127.0.0.1${port}`;
  const localhostOrigin = `${protocol}//localhost${port}`;
  const currentOrigin = `${protocol}//${options.location.hostname || '127.0.0.1'}${port}`;

  return {
    recommendedRenderUrl: `${recommendedOrigin}/?obs=1${transparentPart}`,
    localhostRenderUrl: `${localhostOrigin}/?obs=1${transparentPart}`,
    debugRenderUrl: `${recommendedOrigin}/?obs=1${transparentPart}&debug=1`,
    controlUrl: `${currentOrigin}/?control=1`,
  };
}
