import { ComponentType, LazyExoticComponent } from 'react';

export interface RouteConfig {
  path: string;
  component: LazyExoticComponent<ComponentType<any>>;
  public?: boolean;
  roles?: string[];
  exact?: boolean;
}
