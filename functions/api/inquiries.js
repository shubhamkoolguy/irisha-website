import {submitInquiry} from '../../server/contact-worker.mjs';
export function onRequest({request,env}) { return submitInquiry(request,env); }
