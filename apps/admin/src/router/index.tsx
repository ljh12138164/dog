import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Protext from '../container/protext';

// 懒加载组件
const AdminLayout = lazy(() => import('../page'));
const Login = lazy(() => import('../page/login'));
const Dashboard = lazy(() => import('../page/dashboard'));
const Users = lazy(() => import('../page/users'));
const Home = lazy(() => import('../page/home'));
const Show = lazy(() => import('../page/show'));
const Feedback = lazy(() => import('../page/feekback'));
const Stock = lazy(() => import('../page/stock'));
const FeedbackDetail = lazy(() => import('../page/feekback/id'));
// const Create = lazy(() => import('../page/autoform/create'));
// const AutoForm = lazy(() => import('../page/autoform'));

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
      {
        path: 'feedback',
        element: <Feedback />,
      },
      {
        path: 'feedback/:id',
        element: <FeedbackDetail />,
      },
      {
        path: 'show',
        element: <Show />,
      },
      {
        path: 'stock',
        element: <Stock />,
      },
      // {
      //   path: 'autoform',
      //   element: <AutoForm />,
      // },
      // {
      //   path: 'autoform/create',
      //   element: <Create />,
      // },
    ],
  },
]);

export default router;
