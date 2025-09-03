CREATE TABLE shortened_urls (
    id serial PRIMARY KEY,
    original_url text NOT NULL,
    short_code varchar(255) NOT NULL UNIQUE,
    created_at timestamp NOT NULL DEFAULT now()
);
