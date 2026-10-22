# Product scripts. Run from the repository root.

ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

.PHONY: help pwa appstore

.DEFAULT_GOAL := help

help:
	@printf '%s\n' \
		'pwa        copy App/build into Site/static/pwa' \
		'appstore   store / landing screenshots (needs the app on :5173 and Chrome)'

pwa:
	node $(ROOT)/scripts/deploy-pwa.mjs

appstore:
	node $(ROOT)/scripts/generate-appstore-images.mjs $(ARGS)
