/**
 * The language the film is currently speaking.
 *
 * Context rather than props because scenes are meant to stay independently
 * editable: threading a `copy` object through seven components would mean
 * every future scene has to be given it, and every existing one has to be
 * touched to add the eighth. A scene asks for the words it needs and nothing
 * else changes.
 *
 * The default is English so the film renders standalone — in the dev
 * scrubber, or in an offline render that has no provider around it.
 */

import { createContext, useContext, type ReactNode } from "react";

import { FILM_COPY, type FilmCopy } from "@/video/copy";

const CopyContext = createContext<FilmCopy>(FILM_COPY.en);

export function FilmCopyProvider({
  copy,
  children,
}: {
  copy: FilmCopy;
  children: ReactNode;
}) {
  return <CopyContext.Provider value={copy}>{children}</CopyContext.Provider>;
}

export function useFilmCopy(): FilmCopy {
  return useContext(CopyContext);
}
