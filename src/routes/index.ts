import deploymentRouter from './deployments.route'
import webhooksRouter from './webhooks.route'


const routes = [
    deploymentRouter, 
    webhooksRouter,
] as const;

export default routes;