-- name: object_parameter
SELECT *
FROM badge
WHERE user_id = :user_id
