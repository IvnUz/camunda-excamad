<template>
  <div id="incident">
    <atom-spinner
      v-if="!(ready == true)"
      class="spinner"
      :animation-duration="1000"
      :size="60"
      :color="'#007bff'"
    />

    <h2>Incidents count: {{ totalIncidentCount }}</h2>
    <b-form-checkbox
      id="checkbox1"
      name="checkbox1"
      v-model="hideParentIncidents"
      >Hide parent incidents</b-form-checkbox
    >
    <div v-if="incidents.length != 0">
      <b-form class="mb-2" inline>
        <b-form-input
          v-on:change="countErrorJobs"
          v-model="activityIdForJobSearch"
          list="my-list-id"
        ></b-form-input>

        <datalist id="my-list-id">
          <option v-bind:key="item" v-for="item in filterFailedActivity">
            {{ item }}
          </option>
        </datalist>

        <b-form-input
          class="ml-1"
          v-model="countOfJobs"
          type="number"
        ></b-form-input>
        <b-btn class="ml-1" variant="warning" @click="getFistNJobs"
          >Rerun {{ countOfJobs }} jobs</b-btn
        >
        <b-btn class="ml-1" variant="danger" @click="healAndRetry"
          >Rerun all activities</b-btn
        >
      </b-form>
      <small>
        <div class="row">
          <div class="col-md-12">
            <div class="panel-body">
              <table class="table table-striped table-hover table-sm">
                <thead>
                  <tr>
                    <th>Failed activity</th>
                    <th>Error text</th>
                    <th>Root</th>
                    <th>Cause</th>
                    <th>Time</th>
                    <th>Definition</th>
                    <th>Instance</th>
                    <th>Fix</th>
                    <th>Delete instance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr :key="item.id" v-for="item in incidentsToShow">
                    <td style="word-break: break-all">{{ item.activityId }}</td>
                    <td style="word-break: break-all">
                      {{
                        item.incidentMessage
                          ? item.incidentMessage.substring(0, 100) + "..."
                          : ""
                      }}
                    </td>
                    <td>{{ item.rootCauseIncidentId }}</td>
                    <td>{{ item.causeIncidentId }}</td>
                    <td style="word-break: break-all">
                      {{ convertDateToHumanStyle(item.incidentTimestamp) }}
                    </td>
                    <td style="word-break: break-all">
                      {{ item.processDefinitionId }}
                    </td>
                    <td style="word-break: break-all">
                      <router-link
                        :to="{
                          name: 'processdetail',
                          params: { processInstanceId: item.processInstanceId },
                        }"
                      >
                        <p class="card-text">
                          <b>{{ item.processInstanceId }}</b>
                        </p>
                      </router-link>
                    </td>
                    <td style="word-break: break-all">
                      <b-btn
                        size="sm"
                        class="ml-2"
                        variant="info"
                        @click="updateSingleJobRetry(item)"
                      >
                        <font-awesome-icon icon="redo" />
                      </b-btn>
                    </td>
                    <td style="word-break: break-all">
                      <b-btn
                        size="sm"
                        class="ml-2"
                        variant="warning"
                        @click="DeleteProccessInstance(item)"
                      >
                        <font-awesome-icon icon="trash" />
                      </b-btn>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </small>
    </div>
    <div v-if="totalIncidentCount === 0 && ready">
      <div class="alert alert-primary" role="alert">No incidents!</div>
    </div>
    <hr />
    <div class="pagination">
      <b-pagination
        v-model="currentPage"
        :total-rows="totalIncidentCount"
        :per-page="incidentsPerPage"
        aria-controls="incident"
      ></b-pagination>
    </div>
  </div>
</template>

<script>
import { library } from "@fortawesome/fontawesome-svg-core";
import { faTrash, faRedo } from "@fortawesome/free-solid-svg-icons";
import * as api from "@/api/api";

library.add(faTrash);
library.add(faRedo);

export default {
  data() {
    return {
      containerClass: "",
      incidents: [],
      jobsIds: [],
      countOfJobs: 25,
      activityIdForJobSearch: null,
      incidentsToShow: [],
      incidentsGlobalRoot: [],
      incidentsNotGlobalRoot: [],
      hideParentIncidents: false,
      ready: null,
      retries: 3,
      jobQuery: {
        withRetriesLeft: 0,
        executable: false,
        withException: true,
        noRetriesLeft: true,
        active: false,
      },
      jobQuerySelected: {
        processInstanceId: [],
        activityId: [],
      },
      currentPage: 1,
      incidentsPerPage: 100,
    };
  },
  watch: {
    hideParentIncidents(newValue) {
      this.incidentsGlobalRoot = this.incidents.filter(function (obj) {
        return obj.globalRoot === true;
      });
      if (newValue == true) {
        this.incidentsToShow = this.incidentsGlobalRoot.slice(
          (this.currentPage - 1) * this.incidentsPerPage,
          this.currentPage * this.incidentsPerPage
        );
      }

      if (newValue == false) {
        this.incidentsToShow = this.incidents.slice(
          (this.currentPage - 1) * this.incidentsPerPage,
          this.currentPage * this.incidentsPerPage
        );
      }
    },
    currentPage(newPage) {
      // Update the incidents shown on the current page based on hideParentIncidents value
      if (this.hideParentIncidents) {
        this.incidentsToShow = this.incidentsGlobalRoot.slice(
          (newPage - 1) * this.incidentsPerPage,
          newPage * this.incidentsPerPage
        );
      } else {
        this.incidentsToShow = this.incidents.slice(
          (newPage - 1) * this.incidentsPerPage,
          newPage * this.incidentsPerPage
        );
      }
    },
  },
  methods: {
    getAllIncidents() {
      api
        .getEntity("incident", "", "sortBy=incidentTimestamp&sortOrder=desc")
        .then((value) => {
          this.incidents = value;
          var vm = this;
          this.ready = true;
          this.incidents.forEach((incident) => {
            if (!incident.incidentMessage) {
              vm.$set(incident, "globalRoot", false);
            } else {
              vm.$set(incident, "globalRoot", true);
            }
          });
          this.updateIncidentsToShow();
        });
    },
    updateIncidentsToShow() {
      const startIndex = (this.currentPage - 1) * this.incidentsPerPage;
      const endIndex = startIndex + this.incidentsPerPage;

      if (this.hideParentIncidents) {
        this.incidentsToShow = this.incidentsGlobalRoot.slice(
          startIndex,
          endIndex
        );
      } else {
        this.incidentsToShow = this.incidents.slice(startIndex, endIndex);
      }
    },
    updateSingleJobRetry(item) {
      this.jobQuerySelected.processInstanceId = [];
      this.jobQuerySelected.activityId = [];
      this.jobQuerySelected.processInstanceId = item.processInstanceId;
      this.jobQuerySelected.activityId = item.activityId;
      this.$api()
        .put("/external-task/"+item.configuration+"/retries", {
          retries: 1
        })
        .then(() => {
          var index = this.incidents.indexOf(item);
          if (index > -1) {
            this.incidents.splice(index, 1);
          }
          this.$notify({
            group: "foo",
            title: "Rerun started",
            type: "info",
          });
        }).catch((error) => {
          if (error) {
            this.$notify({
              group: "foo",
              title: "Single job Rerun cant start :(",
              type: "error",
            });
          }
        });
    },
    healAndRetry() {
      this.retryAllIncidents();

      setTimeout(() => {
        this.getAllIncidents();
      }, 5000);
    },
    convertDateToHumanStyle: function (date) {
      return this.$momenttrue(date).startOf("second").fromNow();
    },
    retryAllIncidents() {
      this.$api()
        .post("/job/retries/", {
          retries: this.retries,
          jobQuery: this.jobQuery,
        })
        .then((response) => {
          if (response) {
            this.$notify({
              group: "foo",
              title: "Rerun started",
              type: "info",
            });
          }
        })
        .catch((error) => {
          if (error) {
            this.$notify({
              group: "foo",
              title: "Rerun cant start :(",
              type: "error",
            });
          }
        });
    },
    DeleteProccessInstance(item) {
      this.$api()
        .delete("/process-instance/" + item.processInstanceId)
        .then((response) => {
          if (response) {
            this.$notify({
              group: "foo",
              title: "Instance deleted",
              text: item.processInstanceId,
              type: "success",
            });
          }
          var index = this.incidents.indexOf(item);
          if (index > -1) {
            this.incidents.splice(index, 1);
          }
        })
        .catch((error) => {
          this.$notify({
            group: "foo",
            title: "Instance NOT deleted",
            text: error,
            type: "error",
          });
        });
    },
    getFistNJobs() {
      if (this.countOfJobs > 500) {
        this.countOfJobs = 500;
      }
      this.jobsIds = [];
      var postBody = {
        withException: true,
        noRetriesLeft: true,
        activityId: this.activityIdForJobSearch,
      };
      this.$api()
        .get("/incident?maxResults=" + this.countOfJobs)
        .then((response) => {
          if (response.data != null && response.data.length > 0) {
            response.data.forEach((element) => {
              if (
                element.incidentType === "failedExternalTask" &&
                element.configuration != null
              ) {
                this.jobsIds.push(element.configuration);
              }
            });
            var postBodyJobsId = {
              externalTaskIds: this.jobsIds,
              retries: 1,
            };
            this.$api()
              .put("external-task/retries", postBodyJobsId)
              .then(() => {
                this.$notify({
                  group: "foo",
                  title: "Restarted " + this.jobsIds.length + " jobs",
                  type: "success",
                });
                this.getAllIncidents();
              })
              .catch((error) => {
                this.$notify({
                  group: "foo",
                  title: "Fail",
                  text: error,
                  type: "error",
                });
              });
          }
        });
    },
    countErrorJobs: function (selectedItem) {
      this.$api()
        .get("job/count?activityId=" + selectedItem)
        .then((response) => {
          this.countOfJobs = response.data.count;
        });
    },
  },

  mounted: function () {
    this.getAllIncidents();
  },
  computed: {
    filteredIncidents() {
      return this.incidents.filter((item) => {
        if (this.hideParentIncidents) {
          return item.globalRoot === true;
        } else {
          return true; // Show all incidents
        }
      });
    },
    totalIncidentCount() {
      return this.filteredIncidents.length;
    },
  },
};
</script>

<style>
.router-link-exact-active {
  font-style: bold;
  font-size: 24px;
}
</style>
