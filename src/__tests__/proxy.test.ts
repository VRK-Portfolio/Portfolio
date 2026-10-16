import { proxy } from "@/proxy";
import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";

describe("Proxy Tests", () => {
   test("should test proxy functionality without accesstoken", () => {
       const req = new NextRequest("http://localhost:3000/admin/dashboard");

       const response = proxy(req);

       expect(response.status).toBe(307)
       expect(response.headers.get("location")).toBe("http://localhost:3000/login");
   });

   test("should test  proxy functionality with accesstoken", () => {
       const req = new NextRequest("http://localhost:3000/admin/dashboard", {
           headers: {
                cookie: "accessToken=mock-valid-token"
           }
       });

       const response = proxy(req);

       expect(response.status).not.toBe(307);
       expect(response.headers.get("x-middleware-next")).toBe("1");
   });

   test("should redirect to dashboard page when reload and accesstoken is available is valid", () => {
       const req = new NextRequest("http://localhost:3000/login", {
           headers: {
                cookie: "accessToken=mock-vali-token"
           }
       });

       const response = proxy(req);

       expect(response.status).toBe(307);
       expect(response.headers.get("location")).toBe("http://localhost:3000/admin/dashboard");
   });
});