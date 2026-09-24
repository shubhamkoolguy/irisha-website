import {getCaptchaConfig} from '../../server/contact-worker.mjs';
export function onRequest({request,env}) { return getCaptchaConfig(request,env); }
