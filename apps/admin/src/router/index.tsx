import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Protext from '../container/protext';

// 懒加载组件
const AdminLayout = lazy(() => import('../page/layout'));
const Login = lazy(() => import('../page/login'));
const Dashboard = lazy(() => import('../page/dashboard'));
const Users = lazy(() => import('../page/users'));
const Home = lazy(() => import('../page/home'));
const AutoForm = lazy(() => import('../page/AutoForm'));

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <Protext>
        <AdminLayout />
      </Protext>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'users',
        element: <Users />,
      },
      {
        path: 'home',
        element: <Home />,
      },
      // {
      //   path: 'autoform',
      //   element: <AutoForm />,
      // },
    ],
  },
]);

export default router;
