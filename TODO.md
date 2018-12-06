# TODO + data
  * Add `assignee` and `closer` dimensions and rename `User name` to `Author`
  * Reimplement the update of the downloaded data
  * Delete all the functions that are unused
  * Reduce the file's open/close operations when simplifying/decomposing/bundling data (use RAM instead)
  * Delete `decompose` operation (no longer needed)

## Instructions...
  == Estadísticas de github
    == Reviews
    == Issues
    == Cuantos comentarios en el Issue
    == Tiempos
      issues -> commit -> pr -> merge

    ** Issues     =>    Issues
    ** Commit     =>    Search
    ** Pull Req   =>    Pull Req
    ** Merge      =>    Pull Req

    - cantidad d commits ()
    - LOC modificadas (add / remove ) (por tipo de fichero | Travis failure vs success)
    - # PR's (open vs merged vs closed)
    - # issues cerrados
    - # de reviews en los PR q creó
    - tiempo entre fases de los issues (creado, asignado, primer commit, cerrado)
    - Agregar metricas de los forks
    - Porciento de trabajo entre el upstream y el fork

    todo eso:

    - por escalas d tiempo (diario, semanal, mensual)
    - por proyectos vs total
    - por persona vs todo el equipo

    ============================
            PREGUNTAS
      -- TravisCI ????????
      -- por proyectos vs total

## Event types
  labeled                             -
  subscribed                          -
  mentioned                           -
  milestoned                          -
  demilestoned                        -
  review_requested                    -
  review_request_removed              -

  referenced                          +
  assigned                            +
  closed                              +
  merged                              +

## Last page fetched

  commits 16
  issues 15
  pulls 7