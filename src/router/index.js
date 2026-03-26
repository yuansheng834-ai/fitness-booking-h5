import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import LoginPage from "../views/LoginPage.vue";
import RegisterPage from "../views/RegisterPage.vue";
import MemberPortalPage from "../views/MemberPortalPage.vue";
import MemberMePage from "../views/MemberMePage.vue";
import CoachPortalPage from "../views/CoachPortalPage.vue";
import AdminPortalPage from "../views/AdminPortalPage.vue";
import AdminUsersPage from "../views/AdminUsersPage.vue";
import { getCurrentUser, roleToPortalPath } from "../lib/auth";

const routes = [
  { path: "/", name: "home", component: HomePage },
  { path: "/login", name: "login", component: LoginPage },
  { path: "/register", name: "register", component: RegisterPage },
  {
    path: "/portal/member",
    name: "portal-member",
    component: MemberPortalPage,
    meta: { requiresAuth: true, roles: ["member"] }
  },
  {
    path: "/portal/member/me",
    name: "portal-member-me",
    component: MemberMePage,
    meta: { requiresAuth: true, roles: ["member"] }
  },
  {
    path: "/portal/coach",
    name: "portal-coach",
    component: CoachPortalPage,
    meta: { requiresAuth: true, roles: ["coach"] }
  },
  {
    path: "/portal/admin",
    name: "portal-admin",
    component: AdminPortalPage,
    meta: { requiresAuth: true, roles: ["admin"] }
  },
  {
    path: "/portal/admin/users",
    name: "portal-admin-users",
    component: AdminUsersPage,
    meta: { requiresAuth: true, roles: ["admin"] }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const currentUser = getCurrentUser();

  if (to.meta.requiresAuth && !currentUser) {
    return "/login";
  }

  if (to.meta.roles && to.meta.roles.length > 0) {
    if (!currentUser) {
      return "/login";
    }

    if (!to.meta.roles.includes(currentUser.role)) {
      return roleToPortalPath(currentUser.role);
    }
  }

  if ((to.path === "/login" || to.path === "/register") && currentUser) {
    return roleToPortalPath(currentUser.role);
  }

  return true;
});

export default router;
