/* eslint-disable react/prop-types */

import {useNavigate} from "react-router-dom";
import {UrlState} from "@/context";
import {useEffect} from "react";
import {BarLoader} from "react-spinners";

function RequireAuth({children}) {
  const navigate = useNavigate();

  const {loading, isAuthenticated} = UrlState();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/auth");
  }, [isAuthenticated, loading]);

  if (loading) return <BarLoader width={"100%"} color="#36d7b7" />;

  if (isAuthenticated) return children;
}

export default RequireAuth;
