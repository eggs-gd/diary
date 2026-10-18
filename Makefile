# Product scripts. Run from the repository root.

ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

.PHONY: help pwa

.DEFAULT_GOAL := help

help:
	@printf '%s\n' \
		'pwa    copy App/build into Site/static/pwa'

pwa:
	node $(ROOT)/scripts/deploy-pwa.mjs
