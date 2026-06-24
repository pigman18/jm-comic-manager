import { combineReducers } from "redux";
import settingsReducer from "../reducers/settingsReducer";
import mainReducer from "../reducers/mainReducer";
import detailReducer from "../reducers/detailReducer";
import forumReducer from "../reducers/forumReducer";
import searchReducer from "../reducers/searchReducer";
import weekReducer from "../reducers/weekReducer";
import blogsReducer from "../reducers/blogsReducer";
import creatorReducer from "../reducers/creatorReducer";
import categoriesReducer from "../reducers/categoriesReducer";
import memberReducer from "../reducers/memberReducer";
import gamesReducer from "../reducers/gamesReducer";
import moviesReducer from "../reducers/moviesReducer";
import moviesPlayerReducer from "../reducers/moviesPlayerReducer";
import hotUpdateReducer from "../reducers/hotUpdateReducer";
import novelReducer from "../reducers/novelReducer";


const rootReducer = combineReducers({
  hotUpdate: hotUpdateReducer,
  settings: settingsReducer,
  main: mainReducer,
  detail: detailReducer,
  forum: forumReducer,
  search: searchReducer,
  week: weekReducer,
  blogs: blogsReducer,
  creator: creatorReducer,
  categories: categoriesReducer,
  member: memberReducer,
  games: gamesReducer,
  movies: moviesReducer,
  MoviesPlayer: moviesPlayerReducer,
  novel: novelReducer
});

export default rootReducer;
