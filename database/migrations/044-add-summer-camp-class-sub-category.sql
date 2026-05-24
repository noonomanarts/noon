-- Add Summer Camp as a class sub-category for existing databases.
ALTER TYPE class_sub_category ADD VALUE IF NOT EXISTS 'SUMMER_CAMP' AFTER 'MOM_AND_KID';
