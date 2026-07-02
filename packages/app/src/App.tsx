import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import techDocsPlugin from '@backstage/plugin-techdocs/alpha';
import { navModule } from './modules/nav';

export default createApp({
  features: [catalogPlugin, techDocsPlugin, navModule],
});
