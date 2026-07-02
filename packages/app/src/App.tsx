import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import searchPlugin from '@backstage/plugin-search/alpha';
import techDocsPlugin from '@backstage/plugin-techdocs/alpha';
import { navModule } from './modules/nav';

export default createApp({
  features: [catalogPlugin, searchPlugin, techDocsPlugin, navModule],
});
