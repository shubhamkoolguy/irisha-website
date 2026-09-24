import {verifyContact} from '../../server/contact-worker.mjs';
export function onRequest({request,env}) { return verifyContact(request,env); }
