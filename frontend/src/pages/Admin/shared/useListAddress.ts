import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

// Every list page has its address: /admin/<page> for the list, /admin/<page>/<id>
// for one item, and the filter in ?show=, so any view can be linked to.
export function useListAddress(base: string, defaultFilter: string) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { search } = useLocation();

  return {
    selectedId: id ?? null,
    filter: params.get("show") ?? defaultFilter,
    // An item's link keeps the filter you are on
    itemPath: (itemId: string) => `${base}/${itemId}${search}`,
    filterPath: (value: string) => `${base}?show=${value}`,
    close: () => navigate(`${base}${search}`),
  };
}
